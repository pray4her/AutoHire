import { Prisma } from "@prisma/client";

import { getRuntimeMode } from "@/lib/env";
import type {
  InitialMaterialReviewReportEmailRecord,
  InitialMaterialReviewReportEmailStatus,
  InitialMaterialReviewReportPayload,
} from "@/lib/initial-material-review-report-email/types";

type MemoryStoreSlice = {
  initialMaterialReviewReportEmails: InitialMaterialReviewReportEmailRecord[];
};

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

function getMemoryStoreSlice(): MemoryStoreSlice {
  const globalStore = globalThis as typeof globalThis & {
    __autohireStore?: MemoryStoreSlice;
  };

  if (!globalStore.__autohireStore) {
    throw new Error("Memory store is not initialized.");
  }

  if (!globalStore.__autohireStore.initialMaterialReviewReportEmails) {
    globalStore.__autohireStore.initialMaterialReviewReportEmails = [];
  }

  return globalStore.__autohireStore;
}

async function getPrisma() {
  const { prisma } = await import("@/lib/db/prisma");
  return prisma;
}

function mapPrismaRecord(
  record: {
    id: string;
    applicationId: string;
    reviewRunId: string;
    recipientEmail: string;
    subject: string;
    reportPayload: unknown;
    status: string;
    attemptCount: number;
    lastAttemptAt: Date | null;
    nextRetryAt: Date | null;
    errorMessage: string | null;
    providerMessageId: string | null;
    sentAt: Date | null;
    inviteTokenAvailable: boolean;
    createdAt: Date;
    updatedAt: Date;
  },
): InitialMaterialReviewReportEmailRecord {
  return {
    ...record,
    reportPayload: record.reportPayload as InitialMaterialReviewReportPayload,
    status: record.status as InitialMaterialReviewReportEmailStatus,
  };
}

export async function getInitialMaterialReviewReportEmailByApplicationId(
  applicationId: string,
): Promise<InitialMaterialReviewReportEmailRecord | null> {
  if (getRuntimeMode() === "memory") {
    return (
      getMemoryStoreSlice().initialMaterialReviewReportEmails.find(
        (item) => item.applicationId === applicationId,
      ) ?? null
    );
  }

  const prisma = await getPrisma();
  const record = await prisma.initialMaterialReviewReportEmail.findUnique({
    where: { applicationId },
  });

  return record ? mapPrismaRecord(record) : null;
}

export async function createInitialMaterialReviewReportEmail(input: {
  applicationId: string;
  reviewRunId: string;
  recipientEmail: string;
  subject: string;
  reportPayload: InitialMaterialReviewReportPayload;
  inviteTokenAvailable: boolean;
}): Promise<InitialMaterialReviewReportEmailRecord> {
  if (getRuntimeMode() === "memory") {
    const store = getMemoryStoreSlice();
    const existing = store.initialMaterialReviewReportEmails.find(
      (item) => item.applicationId === input.applicationId,
    );

    if (existing) {
      throw new Error(
        "Initial material review report email already exists for this application.",
      );
    }

    const now = new Date();
    const record: InitialMaterialReviewReportEmailRecord = {
      id: createId("imrre"),
      applicationId: input.applicationId,
      reviewRunId: input.reviewRunId,
      recipientEmail: input.recipientEmail,
      subject: input.subject,
      reportPayload: input.reportPayload,
      status: "PENDING",
      attemptCount: 0,
      lastAttemptAt: null,
      nextRetryAt: null,
      errorMessage: null,
      providerMessageId: null,
      sentAt: null,
      inviteTokenAvailable: input.inviteTokenAvailable,
      createdAt: now,
      updatedAt: now,
    };

    store.initialMaterialReviewReportEmails.push(record);
    return record;
  }

  const prisma = await getPrisma();

  try {
    const record = await prisma.initialMaterialReviewReportEmail.create({
      data: {
        applicationId: input.applicationId,
        reviewRunId: input.reviewRunId,
        recipientEmail: input.recipientEmail,
        subject: input.subject,
        reportPayload: input.reportPayload as Prisma.InputJsonValue,
        inviteTokenAvailable: input.inviteTokenAvailable,
      },
    });

    return mapPrismaRecord(record);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error(
        "Initial material review report email already exists for this application.",
      );
    }

    throw error;
  }
}

export async function updateInitialMaterialReviewReportEmail(
  applicationId: string,
  input: {
    status?: InitialMaterialReviewReportEmailStatus;
    attemptCount?: number;
    lastAttemptAt?: Date | null;
    nextRetryAt?: Date | null;
    errorMessage?: string | null;
    providerMessageId?: string | null;
    sentAt?: Date | null;
    recipientEmail?: string;
    subject?: string;
    reportPayload?: InitialMaterialReviewReportPayload;
    inviteTokenAvailable?: boolean;
  },
): Promise<InitialMaterialReviewReportEmailRecord | null> {
  if (getRuntimeMode() === "memory") {
    const record = getMemoryStoreSlice().initialMaterialReviewReportEmails.find(
      (item) => item.applicationId === applicationId,
    );

    if (!record) {
      return null;
    }

    if (input.status !== undefined) {
      record.status = input.status;
    }
    if (input.attemptCount !== undefined) {
      record.attemptCount = input.attemptCount;
    }
    if (input.lastAttemptAt !== undefined) {
      record.lastAttemptAt = input.lastAttemptAt;
    }
    if (input.nextRetryAt !== undefined) {
      record.nextRetryAt = input.nextRetryAt;
    }
    if (input.errorMessage !== undefined) {
      record.errorMessage = input.errorMessage;
    }
    if (input.providerMessageId !== undefined) {
      record.providerMessageId = input.providerMessageId;
    }
    if (input.sentAt !== undefined) {
      record.sentAt = input.sentAt;
    }
    if (input.recipientEmail !== undefined) {
      record.recipientEmail = input.recipientEmail;
    }
    if (input.subject !== undefined) {
      record.subject = input.subject;
    }
    if (input.reportPayload !== undefined) {
      record.reportPayload = input.reportPayload;
    }
    if (input.inviteTokenAvailable !== undefined) {
      record.inviteTokenAvailable = input.inviteTokenAvailable;
    }
    record.updatedAt = new Date();

    return record;
  }

  const prisma = await getPrisma();
  const record = await prisma.initialMaterialReviewReportEmail.update({
    where: { applicationId },
    data: {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.attemptCount !== undefined
        ? { attemptCount: input.attemptCount }
        : {}),
      ...(input.lastAttemptAt !== undefined
        ? { lastAttemptAt: input.lastAttemptAt }
        : {}),
      ...(input.nextRetryAt !== undefined
        ? { nextRetryAt: input.nextRetryAt }
        : {}),
      ...(input.errorMessage !== undefined
        ? { errorMessage: input.errorMessage }
        : {}),
      ...(input.providerMessageId !== undefined
        ? { providerMessageId: input.providerMessageId }
        : {}),
      ...(input.sentAt !== undefined ? { sentAt: input.sentAt } : {}),
      ...(input.recipientEmail !== undefined
        ? { recipientEmail: input.recipientEmail }
        : {}),
      ...(input.subject !== undefined ? { subject: input.subject } : {}),
      ...(input.reportPayload !== undefined
        ? { reportPayload: input.reportPayload as Prisma.InputJsonValue }
        : {}),
      ...(input.inviteTokenAvailable !== undefined
        ? { inviteTokenAvailable: input.inviteTokenAvailable }
        : {}),
    },
  });

  return mapPrismaRecord(record);
}
