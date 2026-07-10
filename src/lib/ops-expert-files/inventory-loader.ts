import type { MaterialCategory } from "@/features/application/types";
import { getRuntimeMode } from "@/lib/env";
import {
  buildArchivePathsForFiles,
  type ExpertFileInventory,
} from "@/lib/ops-expert-files/inventory";

export async function loadExpertFileInventory(
  applicationId: string,
): Promise<(ExpertFileInventory & { applicationId: string }) | null> {
  const {
    getApplicationById,
    getLatestResumeFile,
    listMaterials,
    listSupplementFiles,
  } = await import("@/lib/data/store");

  const application = await getApplicationById(applicationId);
  if (!application?.customerNo) {
    return null;
  }

  const resume = await getLatestResumeFile(applicationId);
  const materials = (await listMaterials(applicationId)).filter(
    (item) => item.category !== "PRODUCT",
  );

  const supplementFiles = await listSupplementFiles(applicationId);
  const confirmedBatchIds = await listConfirmedSupplementBatchIds(applicationId);
  const supplements = supplementFiles
    .filter((item) => confirmedBatchIds.has(item.uploadBatchId))
    .map((item) => ({
      id: item.id,
      category: item.category as MaterialCategory,
      fileName: item.fileName,
      objectKey: item.objectKey,
      fileType: item.fileType,
      fileSize: item.fileSize,
      uploadedAt: item.uploadedAt,
      uploadBatchId: item.uploadBatchId,
    }));

  const extraction = await loadSucceededExtraction(applicationId);
  const secondary = await loadLatestSecondaryExport(applicationId);

  const inventory = buildArchivePathsForFiles({
    customerNo: application.customerNo,
    resume: resume
      ? {
          id: resume.id,
          fileName: resume.fileName,
          objectKey: resume.objectKey,
          fileType: resume.fileType,
          fileSize: resume.fileSize,
          uploadedAt: resume.uploadedAt,
        }
      : null,
    materials: materials.map((item) => ({
      id: item.id,
      category: item.category,
      fileName: item.fileName,
      objectKey: item.objectKey,
      fileType: item.fileType,
      fileSize: item.fileSize,
      uploadedAt: item.uploadedAt,
    })),
    supplements,
    extraction,
    secondary,
  });

  return {
    ...inventory,
    applicationId,
  };
}

async function listConfirmedSupplementBatchIds(applicationId: string) {
  const ids = new Set<string>();

  if (getRuntimeMode() === "memory") {
    const store = (
      globalThis as unknown as {
        __autohireStore?: {
          supplementUploadBatches: Array<{
            id: string;
            applicationId: string;
            status: string;
          }>;
        };
      }
    ).__autohireStore;

    for (const batch of store?.supplementUploadBatches ?? []) {
      if (
        batch.applicationId === applicationId &&
        ["CONFIRMED", "REVIEWING", "COMPLETED"].includes(batch.status)
      ) {
        ids.add(batch.id);
      }
    }
    return ids;
  }

  const { prisma } = await import("@/lib/db/prisma");
  const batches = await prisma.supplementUploadBatch.findMany({
    where: {
      applicationId,
      status: { in: ["CONFIRMED", "REVIEWING", "COMPLETED"] },
    },
    select: { id: true },
  });

  for (const batch of batches) {
    ids.add(batch.id);
  }
  return ids;
}

async function loadSucceededExtraction(applicationId: string) {
  if (getRuntimeMode() === "memory") {
    const store = (
      globalThis as unknown as {
        __autohireStore?: {
          extractionExports: Array<{
            id: string;
            applicationId: string;
            objectKey: string;
            status: string;
            fileSize: number | null;
            exportedAt: Date | null;
          }>;
        };
      }
    ).__autohireStore;

    const row = store?.extractionExports.find(
      (item) =>
        item.applicationId === applicationId && item.status === "SUCCEEDED",
    );
    return row
      ? {
          id: row.id,
          objectKey: row.objectKey,
          fileSize: row.fileSize,
          exportedAt: row.exportedAt,
        }
      : null;
  }

  const { prisma } = await import("@/lib/db/prisma");
  const row = await prisma.applicationExtractionExport.findFirst({
    where: { applicationId, status: "SUCCEEDED" },
  });

  return row
    ? {
        id: row.id,
        objectKey: row.objectKey,
        fileSize: row.fileSize,
        exportedAt: row.exportedAt,
      }
    : null;
}

async function loadLatestSecondaryExport(applicationId: string) {
  if (getRuntimeMode() === "memory") {
    const store = (
      globalThis as unknown as {
        __autohireStore?: {
          secondaryAnalysisRuns: Array<{
            id: string;
            applicationId: string;
            exportObjectKey: string | null;
            exportFileName: string | null;
            exportContentType: string | null;
            exportFileSize: number | null;
            createdAt: Date;
          }>;
        };
      }
    ).__autohireStore;

    const row = (store?.secondaryAnalysisRuns ?? [])
      .filter(
        (item) =>
          item.applicationId === applicationId && item.exportObjectKey,
      )
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];

    return row?.exportObjectKey
      ? {
          id: row.id,
          objectKey: row.exportObjectKey,
          fileName: row.exportFileName,
          contentType: row.exportContentType,
          fileSize: row.exportFileSize,
        }
      : null;
  }

  const { prisma } = await import("@/lib/db/prisma");
  const row = await prisma.secondaryAnalysisRun.findFirst({
    where: {
      applicationId,
      exportObjectKey: { not: null },
    },
    orderBy: { createdAt: "desc" },
  });

  return row?.exportObjectKey
    ? {
        id: row.id,
        objectKey: row.exportObjectKey,
        fileName: row.exportFileName,
        contentType: row.exportContentType,
        fileSize: row.exportFileSize,
      }
    : null;
}

export async function getExpertFileDetail(applicationId: string) {
  const { getApplicationById } = await import("@/lib/data/store");
  const application = await getApplicationById(applicationId);
  if (!application?.customerNo) {
    return null;
  }

  const inventory = await loadExpertFileInventory(applicationId);
  if (!inventory) {
    return null;
  }

  let invitationEmail: string | null = null;
  if (getRuntimeMode() === "memory") {
    const store = (
      globalThis as unknown as {
        __autohireStore?: {
          invitations: Array<{ id: string; email: string | null }>;
        };
      }
    ).__autohireStore;
    invitationEmail =
      store?.invitations.find((item) => item.id === application.invitationId)
        ?.email ?? null;
  } else {
    const { prisma } = await import("@/lib/db/prisma");
    const invitation = await prisma.expertInvitation.findUnique({
      where: { id: application.invitationId },
      select: { email: true },
    });
    invitationEmail = invitation?.email ?? null;
  }

  return {
    applicationId: application.id,
    customerNo: application.customerNo,
    expertId: application.expertId,
    screeningPassportFullName: application.screeningPassportFullName,
    screeningContactEmail: application.screeningContactEmail,
    screeningWorkEmail: application.screeningWorkEmail,
    screeningPhoneNumber: application.screeningPhoneNumber,
    invitationEmail,
    applicationStatus: application.applicationStatus,
    eligibilityResult: application.eligibilityResult,
    isSubmitted: application.applicationStatus === "SUBMITTED",
    resumeUploadedAt: application.resumeUploadedAt?.toISOString() ?? null,
    submittedAt: application.submittedAt?.toISOString() ?? null,
    productInnovationDescription: application.productInnovationDescription,
    inventory,
  };
}
