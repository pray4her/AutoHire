import { Prisma } from "@prisma/client";

import { getRuntimeMode } from "@/lib/env";
import {
  buildExtractionExportObjectKey,
  type ApplicationExtractionExportRecord,
  type ExtractionExportStatus,
  type ExtractionExportTrigger,
} from "@/lib/extraction-export/constants";

type MemoryStoreSlice = {
  extractionExports: ApplicationExtractionExportRecord[];
};

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

function getMemoryStoreSlice(): MemoryStoreSlice {
  const globalStore = globalThis as typeof globalThis & {
    __autohireStore?: MemoryStoreSlice & Record<string, unknown>;
  };

  if (!globalStore.__autohireStore) {
    throw new Error("Memory store is not initialized.");
  }

  if (!globalStore.__autohireStore.extractionExports) {
    globalStore.__autohireStore.extractionExports = [];
  }

  return globalStore.__autohireStore as MemoryStoreSlice;
}

async function getPrisma() {
  const { prisma } = await import("@/lib/db/prisma");
  return prisma;
}

function mapPrismaRecord(record: {
  id: string;
  applicationId: string;
  objectKey: string;
  status: string;
  contentSha256: string | null;
  fileSize: number | null;
  dirty: boolean;
  leaseExpiresAt: Date | null;
  lastAttemptAt: Date | null;
  exportedAt: Date | null;
  errorMessage: string | null;
  lastTrigger: string | null;
  attemptCount: number;
  createdAt: Date;
  updatedAt: Date;
}): ApplicationExtractionExportRecord {
  return {
    ...record,
    status: record.status as ExtractionExportStatus,
    lastTrigger: record.lastTrigger as ExtractionExportTrigger | null,
  };
}

export async function getApplicationExtractionExportByApplicationId(
  applicationId: string,
): Promise<ApplicationExtractionExportRecord | null> {
  if (getRuntimeMode() === "memory") {
    return (
      getMemoryStoreSlice().extractionExports.find(
        (item) => item.applicationId === applicationId,
      ) ?? null
    );
  }

  const prisma = await getPrisma();
  const record = await prisma.applicationExtractionExport.findUnique({
    where: { applicationId },
  });

  return record ? mapPrismaRecord(record) : null;
}

export async function ensureApplicationExtractionExport(input: {
  applicationId: string;
  trigger: ExtractionExportTrigger;
}): Promise<ApplicationExtractionExportRecord> {
  const objectKey = buildExtractionExportObjectKey(input.applicationId);

  if (getRuntimeMode() === "memory") {
    const store = getMemoryStoreSlice();
    const existing = store.extractionExports.find(
      (item) => item.applicationId === input.applicationId,
    );

    if (existing) {
      return existing;
    }

    const now = new Date();
    const record: ApplicationExtractionExportRecord = {
      id: createId("extraction_export"),
      applicationId: input.applicationId,
      objectKey,
      status: "PENDING",
      contentSha256: null,
      fileSize: null,
      dirty: false,
      leaseExpiresAt: null,
      lastAttemptAt: null,
      exportedAt: null,
      errorMessage: null,
      lastTrigger: input.trigger,
      attemptCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    store.extractionExports.push(record);
    return record;
  }

  const prisma = await getPrisma();

  try {
    const created = await prisma.applicationExtractionExport.create({
      data: {
        applicationId: input.applicationId,
        objectKey,
        lastTrigger: input.trigger,
      },
    });
    return mapPrismaRecord(created);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.applicationExtractionExport.findUnique({
        where: { applicationId: input.applicationId },
      });
      if (existing) {
        return mapPrismaRecord(existing);
      }
    }
    throw error;
  }
}

export async function updateApplicationExtractionExport(
  applicationId: string,
  patch: Partial<{
    status: ExtractionExportStatus;
    contentSha256: string | null;
    fileSize: number | null;
    dirty: boolean;
    leaseExpiresAt: Date | null;
    lastAttemptAt: Date | null;
    exportedAt: Date | null;
    errorMessage: string | null;
    lastTrigger: ExtractionExportTrigger | null;
    attemptCount: number;
  }>,
): Promise<ApplicationExtractionExportRecord> {
  if (getRuntimeMode() === "memory") {
    const store = getMemoryStoreSlice();
    const index = store.extractionExports.findIndex(
      (item) => item.applicationId === applicationId,
    );

    if (index < 0) {
      throw new Error("Extraction export record was not found.");
    }

    const next: ApplicationExtractionExportRecord = {
      ...store.extractionExports[index],
      ...patch,
      updatedAt: new Date(),
    };
    store.extractionExports[index] = next;
    return next;
  }

  const prisma = await getPrisma();
  const updated = await prisma.applicationExtractionExport.update({
    where: { applicationId },
    data: patch,
  });
  return mapPrismaRecord(updated);
}

/**
 * Atomically claim a RUNNING lease when the record is free or the lease expired.
 * Returns null when another worker still holds a valid lease (caller should mark dirty).
 */
export async function tryClaimApplicationExtractionExportLease(input: {
  applicationId: string;
  trigger: ExtractionExportTrigger;
  leaseExpiresAt: Date;
  now?: Date;
}): Promise<ApplicationExtractionExportRecord | null> {
  const now = input.now ?? new Date();

  if (getRuntimeMode() === "memory") {
    const store = getMemoryStoreSlice();
    const index = store.extractionExports.findIndex(
      (item) => item.applicationId === input.applicationId,
    );

    if (index < 0) {
      throw new Error("Extraction export record was not found.");
    }

    const current = store.extractionExports[index];
    const leaseActive =
      current.status === "RUNNING" &&
      current.leaseExpiresAt &&
      current.leaseExpiresAt.getTime() > now.getTime();

    if (leaseActive) {
      return null;
    }

    const next: ApplicationExtractionExportRecord = {
      ...current,
      status: "RUNNING",
      dirty: false,
      leaseExpiresAt: input.leaseExpiresAt,
      lastAttemptAt: now,
      lastTrigger: input.trigger,
      attemptCount: current.attemptCount + 1,
      errorMessage: null,
      updatedAt: now,
    };
    store.extractionExports[index] = next;
    return next;
  }

  const prisma = await getPrisma();
  const claimed = await prisma.applicationExtractionExport.updateMany({
    where: {
      applicationId: input.applicationId,
      OR: [
        { status: { not: "RUNNING" } },
        { leaseExpiresAt: null },
        { leaseExpiresAt: { lte: now } },
      ],
    },
    data: {
      status: "RUNNING",
      dirty: false,
      leaseExpiresAt: input.leaseExpiresAt,
      lastAttemptAt: now,
      lastTrigger: input.trigger,
      attemptCount: { increment: 1 },
      errorMessage: null,
    },
  });

  if (claimed.count === 0) {
    return null;
  }

  const record = await prisma.applicationExtractionExport.findUnique({
    where: { applicationId: input.applicationId },
  });

  return record ? mapPrismaRecord(record) : null;
}

export async function markApplicationExtractionExportDirty(
  applicationId: string,
  trigger: ExtractionExportTrigger,
) {
  return updateApplicationExtractionExport(applicationId, {
    dirty: true,
    lastTrigger: trigger,
  });
}
