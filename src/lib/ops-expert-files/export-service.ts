import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { createId } from "@/lib/ops-expert-files/id";
import { getEnv, getRuntimeMode } from "@/lib/env";
import { createOssClient } from "@/lib/oss/client";
import { writeStoredObject } from "@/lib/storage/object-store";
import { createDownloadIntent } from "@/lib/upload/service";
import {
  OPS_EXPORT_LEASE_MS,
  OPS_EXPORT_MAX_APPLICATIONS,
  OPS_EXPORT_MAX_BYTES,
  OPS_EXPORT_MAX_RUNNING_GLOBAL,
  OPS_EXPORT_MAX_RUNNING_PER_OPERATOR,
  MATERIAL_ARCHIVE_FOLDERS,
  buildOpsExportEntriesObjectKey,
  buildOpsExportManifestObjectKey,
  buildOpsExportZipObjectKey,
} from "@/lib/ops-expert-files/constants";
import {
  EstimateTokenError,
  hashApplicationIds,
  signEstimateToken,
  verifyEstimateToken,
} from "@/lib/ops-expert-files/estimate-token";
import { invokeOpsExportFunction } from "@/lib/ops-expert-files/fc-client";
import { loadExpertFileInventory } from "@/lib/ops-expert-files/inventory-loader";
import { resolveExportableApplicationIds } from "@/lib/ops-expert-files/query";

export class OpsExportError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, status = 400, code = "OPS_EXPORT_ERROR") {
    super(message);
    this.name = "OpsExportError";
    this.status = status;
    this.code = code;
  }
}

type OpsExportJobRecord = {
  id: string;
  status:
    | "PENDING"
    | "RUNNING"
    | "SUCCEEDED"
    | "SUCCEEDED_WITH_GAPS"
    | "FAILED";
  mode: "FILTER" | "IDS";
  operatorDigest: string;
  filterSnapshot: unknown;
  applicationIds: string[];
  exportableCount: number;
  excludedEmptyCount: number;
  estimatedBytes: number;
  entriesObjectKey: string | null;
  outputObjectKey: string | null;
  zipFileSize: number | null;
  missingCount: number;
  missingSummary: unknown;
  errorMessage: string | null;
  leaseExpiresAt: Date | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

declare global {
  var __autohireOpsExportJobs: OpsExportJobRecord[] | undefined;
}

function getMemoryJobs() {
  if (!globalThis.__autohireOpsExportJobs) {
    globalThis.__autohireOpsExportJobs = [];
  }
  return globalThis.__autohireOpsExportJobs;
}

function assertOssMode() {
  if (getEnv().FILE_STORAGE_MODE !== "oss") {
    throw new OpsExportError(
      "Expert file export is only available when FILE_STORAGE_MODE=oss.",
      400,
      "OPS_EXPORT_OSS_REQUIRED",
    );
  }
}

export async function estimateExpertFileExport(input: {
  mode: "filter" | "ids";
  filter?: {
    q?: string;
    status?: "all" | "submitted" | "unsubmitted";
    startDate?: string | null;
    endDate?: string | null;
  };
  applicationIds?: string[];
}) {
  assertOssMode();

  const resolved = await resolveExportableApplicationIds(input);

  if (resolved.exportableIds.length === 0) {
    throw new OpsExportError(
      "No exportable expert files matched the selection.",
      400,
      "OPS_EXPORT_EMPTY",
    );
  }

  if (resolved.exportableIds.length > OPS_EXPORT_MAX_APPLICATIONS) {
    throw new OpsExportError(
      `Exportable experts (${resolved.exportableIds.length}) exceed the limit of ${OPS_EXPORT_MAX_APPLICATIONS}. Narrow the filter or use selection.`,
      400,
      "OPS_EXPORT_TOO_MANY",
    );
  }

  if (resolved.estimatedBytes > OPS_EXPORT_MAX_BYTES) {
    throw new OpsExportError(
      "Estimated source size exceeds the 2GB limit. Narrow the selection.",
      400,
      "OPS_EXPORT_TOO_LARGE",
    );
  }

  const estimateToken = signEstimateToken({
    mode: input.mode,
    applicationIdsHash: hashApplicationIds(resolved.exportableIds),
    exportableCount: resolved.exportableIds.length,
    excludedEmptyCount: resolved.excludedEmptyCount,
    estimatedBytes: resolved.estimatedBytes,
  });

  return {
    estimateToken,
    exportableCount: resolved.exportableIds.length,
    excludedEmptyCount: resolved.excludedEmptyCount,
    estimatedBytes: resolved.estimatedBytes,
    mode: input.mode,
  };
}

async function countRunningJobs(operatorDigest?: string) {
  if (getRuntimeMode() === "memory") {
    const jobs = getMemoryJobs().filter((job) =>
      ["PENDING", "RUNNING"].includes(job.status),
    );
    return {
      global: jobs.length,
      operator: operatorDigest
        ? jobs.filter((job) => job.operatorDigest === operatorDigest).length
        : 0,
    };
  }

  const { prisma } = await import("@/lib/db/prisma");
  const [global, operator] = await Promise.all([
    prisma.opsExportJob.count({
      where: { status: { in: ["PENDING", "RUNNING"] } },
    }),
    operatorDigest
      ? prisma.opsExportJob.count({
          where: {
            operatorDigest,
            status: { in: ["PENDING", "RUNNING"] },
          },
        })
      : Promise.resolve(0),
  ]);

  return { global, operator };
}

export async function createExpertFileExport(input: {
  mode: "filter" | "ids";
  filter?: {
    q?: string;
    status?: "all" | "submitted" | "unsubmitted";
    startDate?: string | null;
    endDate?: string | null;
  };
  applicationIds?: string[];
  estimateToken: string;
  operatorDigest: string;
}) {
  assertOssMode();

  let tokenPayload;
  try {
    tokenPayload = verifyEstimateToken(input.estimateToken);
  } catch (error) {
    if (error instanceof EstimateTokenError) {
      throw new OpsExportError(error.message, 400, error.code);
    }
    throw error;
  }

  if (tokenPayload.mode !== input.mode) {
    throw new OpsExportError(
      "Estimate token mode mismatch.",
      400,
      "ESTIMATE_TOKEN_MISMATCH",
    );
  }

  const running = await countRunningJobs(input.operatorDigest);
  if (running.operator >= OPS_EXPORT_MAX_RUNNING_PER_OPERATOR) {
    throw new OpsExportError(
      "You already have an export job in progress.",
      409,
      "OPS_EXPORT_OPERATOR_BUSY",
    );
  }
  if (running.global >= OPS_EXPORT_MAX_RUNNING_GLOBAL) {
    throw new OpsExportError(
      "Too many export jobs are running. Try again shortly.",
      409,
      "OPS_EXPORT_GLOBAL_BUSY",
    );
  }

  const resolved = await resolveExportableApplicationIds(input);
  const idsHash = hashApplicationIds(resolved.exportableIds);

  if (
    idsHash !== tokenPayload.applicationIdsHash ||
    resolved.exportableIds.length !== tokenPayload.exportableCount
  ) {
    throw new OpsExportError(
      "Selection changed since estimate. Please estimate again.",
      409,
      "ESTIMATE_STALE",
    );
  }

  if (resolved.exportableIds.length > OPS_EXPORT_MAX_APPLICATIONS) {
    throw new OpsExportError(
      `Exportable experts exceed the limit of ${OPS_EXPORT_MAX_APPLICATIONS}.`,
      400,
      "OPS_EXPORT_TOO_MANY",
    );
  }

  if (resolved.estimatedBytes > OPS_EXPORT_MAX_BYTES) {
    throw new OpsExportError(
      "Estimated source size exceeds the 2GB limit.",
      400,
      "OPS_EXPORT_TOO_LARGE",
    );
  }

  const jobId = createId("ops_export");
  const now = new Date();
  const entriesObjectKey = buildOpsExportEntriesObjectKey(jobId);
  const outputObjectKey = buildOpsExportZipObjectKey(jobId);

  const job = await insertJob({
    id: jobId,
    status: "PENDING",
    mode: input.mode === "filter" ? "FILTER" : "IDS",
    operatorDigest: input.operatorDigest,
    filterSnapshot: input.mode === "filter" ? (input.filter ?? null) : null,
    applicationIds: resolved.exportableIds,
    exportableCount: resolved.exportableIds.length,
    excludedEmptyCount: resolved.excludedEmptyCount,
    estimatedBytes: resolved.estimatedBytes,
    entriesObjectKey,
    outputObjectKey,
    zipFileSize: null,
    missingCount: 0,
    missingSummary: null,
    errorMessage: null,
    leaseExpiresAt: new Date(now.getTime() + OPS_EXPORT_LEASE_MS),
    startedAt: null,
    finishedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  try {
    const entries = await buildEntriesDocument({
      jobId,
      applicationIds: resolved.exportableIds,
      filterSnapshot: input.mode === "filter" ? input.filter : null,
      excludedEmptyCount: resolved.excludedEmptyCount,
    });

    await writeStoredObject(
      entriesObjectKey,
      Buffer.from(JSON.stringify(entries, null, 2), "utf8"),
      "application/json",
    );

    for (const expert of entries.experts) {
      await writeStoredObject(
        buildOpsExportManifestObjectKey(jobId, "expert", expert.customerNo),
        Buffer.from(JSON.stringify(expert.manifest, null, 2), "utf8"),
        "application/json",
      );
    }

    await writeStoredObject(
      buildOpsExportManifestObjectKey(jobId, "export"),
      Buffer.from(JSON.stringify(entries.exportManifest, null, 2), "utf8"),
      "application/json",
    );

    const env = getEnv();
    await invokeOpsExportFunction({
      jobId,
      bucket: env.ALIYUN_OSS_BUCKET ?? "",
      entriesObjectKey,
      outputObjectKey,
      callbackUrl: `${env.APP_BASE_URL.replace(/\/+$/, "")}/api/internal/ops-exports/${jobId}/callback`,
    });

    return updateJob(jobId, {
      status: "RUNNING",
      startedAt: new Date(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Export job failed to start.";
    await updateJob(jobId, {
      status: "FAILED",
      errorMessage: message,
      finishedAt: new Date(),
    });
    throw new OpsExportError(message, 500, "OPS_EXPORT_START_FAILED");
  }
}

async function buildEntriesDocument(input: {
  jobId: string;
  applicationIds: string[];
  filterSnapshot: unknown;
  excludedEmptyCount: number;
}) {
  const experts = [];

  for (const applicationId of input.applicationIds) {
    const detailModule = await import(
      "@/lib/ops-expert-files/inventory-loader"
    );
    const detail = await detailModule.getExpertFileDetail(applicationId);
    const inventory = await loadExpertFileInventory(applicationId);
    if (!detail || !inventory) {
      continue;
    }

    const manifest = {
      applicationId,
      customerNo: detail.customerNo,
      expertId: detail.expertId,
      screeningPassportFullName: detail.screeningPassportFullName,
      screeningContactEmail: detail.screeningContactEmail,
      screeningWorkEmail: detail.screeningWorkEmail,
      invitationEmail: detail.invitationEmail,
      applicationStatus: detail.applicationStatus,
      resumeUploadedAt: detail.resumeUploadedAt,
      submittedAt: detail.submittedAt,
      productInnovationDescription: detail.productInnovationDescription,
      folders: MATERIAL_ARCHIVE_FOLDERS.map((folder) => folder.folder),
      files: inventory.files.map((file) => ({
        source: file.source,
        category: file.category,
        fileName: file.fileName,
        archivePath: file.archivePath,
        objectKey: file.objectKey,
        fileSize: file.fileSize,
      })),
    };

    experts.push({
      applicationId,
      customerNo: detail.customerNo,
      manifest,
      files: inventory.files.map((file) => ({
        objectKey: file.objectKey,
        archivePath: file.archivePath,
      })),
      manifestObjectKey: buildOpsExportManifestObjectKey(
        input.jobId,
        "expert",
        detail.customerNo,
      ),
    });
  }

  const exportManifest = {
    jobId: input.jobId,
    createdAt: new Date().toISOString(),
    filterSnapshot: input.filterSnapshot,
    expertCount: experts.length,
    excludedEmptyCount: input.excludedEmptyCount,
    materialFolders: MATERIAL_ARCHIVE_FOLDERS.map((folder) => folder.folder),
    note: "Please extract with 7-Zip or WinRAR for Chinese path support.",
  };

  const entries = [
    ...experts.flatMap((expert) => [
      ...expert.files.map((file) => ({
        objectKey: file.objectKey,
        archivePath: file.archivePath,
      })),
      {
        objectKey: expert.manifestObjectKey,
        archivePath: `${expert.customerNo}/manifest.json`,
      },
    ]),
    {
      objectKey: buildOpsExportManifestObjectKey(input.jobId, "export"),
      archivePath: "export-manifest.json",
    },
  ];

  return {
    jobId: input.jobId,
    materialFolders: MATERIAL_ARCHIVE_FOLDERS.map((folder) => folder.folder),
    experts,
    exportManifest,
    entries,
  };
}

async function insertJob(job: OpsExportJobRecord) {
  if (getRuntimeMode() === "memory") {
    getMemoryJobs().unshift(job);
    return job;
  }

  const { prisma } = await import("@/lib/db/prisma");
  return prisma.opsExportJob.create({
    data: {
      id: job.id,
      status: job.status,
      mode: job.mode,
      operatorDigest: job.operatorDigest,
      filterSnapshot: job.filterSnapshot as object | undefined,
      applicationIds: job.applicationIds,
      exportableCount: job.exportableCount,
      excludedEmptyCount: job.excludedEmptyCount,
      estimatedBytes: job.estimatedBytes,
      entriesObjectKey: job.entriesObjectKey,
      outputObjectKey: job.outputObjectKey,
      leaseExpiresAt: job.leaseExpiresAt,
    },
  });
}

async function updateJob(
  jobId: string,
  data: Partial<OpsExportJobRecord>,
) {
  if (getRuntimeMode() === "memory") {
    const jobs = getMemoryJobs();
    const index = jobs.findIndex((job) => job.id === jobId);
    if (index < 0) {
      return null;
    }
    jobs[index] = {
      ...jobs[index]!,
      ...data,
      updatedAt: new Date(),
    };
    return jobs[index]!;
  }

  const { prisma } = await import("@/lib/db/prisma");
  return prisma.opsExportJob.update({
    where: { id: jobId },
    data: {
      ...data,
      filterSnapshot:
        data.filterSnapshot === undefined
          ? undefined
          : (data.filterSnapshot as object | undefined),
      missingSummary:
        data.missingSummary === undefined
          ? undefined
          : (data.missingSummary as object | undefined),
    },
  });
}

export async function listExpertFileExportJobs(limit = 20) {
  await expireStaleExportJobs();

  if (getRuntimeMode() === "memory") {
    return getMemoryJobs()
      .slice()
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, limit);
  }

  const { prisma } = await import("@/lib/db/prisma");
  return prisma.opsExportJob.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getExpertFileExportJob(jobId: string) {
  await expireStaleExportJobs(jobId);

  if (getRuntimeMode() === "memory") {
    return getMemoryJobs().find((job) => job.id === jobId) ?? null;
  }

  const { prisma } = await import("@/lib/db/prisma");
  return prisma.opsExportJob.findUnique({ where: { id: jobId } });
}

export async function createExpertFileExportDownloadUrl(jobId: string) {
  assertOssMode();
  const job = await getExpertFileExportJob(jobId);
  if (!job) {
    throw new OpsExportError("Export job not found.", 404, "OPS_EXPORT_NOT_FOUND");
  }

  if (
    !["SUCCEEDED", "SUCCEEDED_WITH_GAPS"].includes(job.status) ||
    !job.outputObjectKey
  ) {
    throw new OpsExportError(
      "Export is not ready for download.",
      409,
      "OPS_EXPORT_NOT_READY",
    );
  }

  const exists = await headObjectExists(job.outputObjectKey);
  if (!exists) {
    throw new OpsExportError(
      "Export package expired. Please retry the export.",
      410,
      "OPS_EXPORT_EXPIRED",
    );
  }

  const intent = await createDownloadIntent({
    objectKey: job.outputObjectKey,
    expiresInSeconds: 3600,
  });

  return {
    downloadUrl: intent.downloadUrl,
    expiresInSeconds: intent.expiresInSeconds,
    objectKey: intent.objectKey,
  };
}

export async function retryExpertFileExport(input: {
  jobId: string;
  operatorDigest: string;
}) {
  const job = await getExpertFileExportJob(input.jobId);
  if (!job) {
    throw new OpsExportError("Export job not found.", 404, "OPS_EXPORT_NOT_FOUND");
  }

  return createExpertFileExport({
    mode: "ids",
    applicationIds: job.applicationIds,
    estimateToken: (
      await estimateExpertFileExport({
        mode: "ids",
        applicationIds: job.applicationIds,
      })
    ).estimateToken,
    operatorDigest: input.operatorDigest,
  });
}

export async function handleExpertFileExportCallback(input: {
  jobId: string;
  status: "SUCCEEDED" | "SUCCEEDED_WITH_GAPS" | "FAILED";
  outputObjectKey?: string;
  zipFileSize?: number;
  missingCount?: number;
  missingSummary?: unknown;
  errorMessage?: string;
}) {
  const job = await getExpertFileExportJob(input.jobId);
  if (!job) {
    throw new OpsExportError("Export job not found.", 404, "OPS_EXPORT_NOT_FOUND");
  }

  if (["SUCCEEDED", "SUCCEEDED_WITH_GAPS"].includes(job.status)) {
    return job;
  }

  if (job.status === "FAILED" && input.status === "FAILED") {
    return job;
  }

  // Allow late success after timeout failure.
  if (
    job.status === "FAILED" &&
    (input.status === "SUCCEEDED" || input.status === "SUCCEEDED_WITH_GAPS")
  ) {
    return updateJob(input.jobId, {
      status: input.status,
      outputObjectKey: input.outputObjectKey ?? job.outputObjectKey,
      zipFileSize: input.zipFileSize ?? null,
      missingCount: input.missingCount ?? 0,
      missingSummary: input.missingSummary ?? null,
      errorMessage: null,
      finishedAt: new Date(),
    });
  }

  if (input.status === "FAILED") {
    return updateJob(input.jobId, {
      status: "FAILED",
      errorMessage: input.errorMessage ?? "Export failed.",
      finishedAt: new Date(),
    });
  }

  return updateJob(input.jobId, {
    status: input.status,
    outputObjectKey: input.outputObjectKey ?? job.outputObjectKey,
    zipFileSize: input.zipFileSize ?? null,
    missingCount: input.missingCount ?? 0,
    missingSummary: input.missingSummary ?? null,
    finishedAt: new Date(),
  });
}

async function expireStaleExportJobs(jobId?: string) {
  const now = new Date();

  if (getRuntimeMode() === "memory") {
    for (const job of getMemoryJobs()) {
      if (
        ["PENDING", "RUNNING"].includes(job.status) &&
        job.leaseExpiresAt &&
        job.leaseExpiresAt < now &&
        (!jobId || job.id === jobId)
      ) {
        if (job.outputObjectKey && (await headObjectExists(job.outputObjectKey))) {
          job.status = "SUCCEEDED";
          job.finishedAt = now;
          job.updatedAt = now;
        } else {
          job.status = "FAILED";
          job.errorMessage = "Export timed out waiting for packager callback.";
          job.finishedAt = now;
          job.updatedAt = now;
        }
      }
    }
    return;
  }

  const { prisma } = await import("@/lib/db/prisma");
  const stale = await prisma.opsExportJob.findMany({
    where: {
      status: { in: ["PENDING", "RUNNING"] },
      leaseExpiresAt: { lt: now },
      ...(jobId ? { id: jobId } : {}),
    },
  });

  for (const job of stale) {
    if (job.outputObjectKey && (await headObjectExists(job.outputObjectKey))) {
      await prisma.opsExportJob.update({
        where: { id: job.id },
        data: { status: "SUCCEEDED", finishedAt: now, errorMessage: null },
      });
    } else {
      await prisma.opsExportJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          finishedAt: now,
          errorMessage: "Export timed out waiting for packager callback.",
        },
      });
    }
  }
}

async function headObjectExists(objectKey: string) {
  const env = getEnv();
  if (env.FILE_STORAGE_MODE !== "oss") {
    try {
      const { readMockObject } = await import("@/lib/storage/object-store");
      await readMockObject(objectKey);
      return true;
    } catch {
      return false;
    }
  }

  try {
    const client = createOssClient();
    await client.send(
      new HeadObjectCommand({
        Bucket: env.ALIYUN_OSS_BUCKET,
        Key: objectKey,
      }),
    );
    return true;
  } catch {
    return false;
  }
}
