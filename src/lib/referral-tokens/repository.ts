import { randomUUID } from "node:crypto";

import { getRuntimeMode } from "@/lib/env";
import { referralDisplayFieldsSchema } from "@/lib/referral-tokens/schemas";
import {
  isPrismaUniqueConstraintError,
  runReferralWriteTransaction,
} from "@/lib/referral-tokens/prisma-write";
import type { ReferralTokenRecord } from "@/lib/referral-tokens/types";

type ReferralTokenMemoryStore = {
  readonly tokens: ReferralTokenRecord[];
};

type CreateReferralTokenRecordInput = {
  readonly applicationId: string;
  readonly expertId: string;
  readonly tokenHash: string;
  readonly displayFields: ReferralTokenRecord["displayFields"];
  readonly expiredAt: Date;
  readonly createdBy: string;
  readonly createdAt: Date;
};

declare global {
  var __autohireReferralTokenStore: ReferralTokenMemoryStore | undefined;
}

function memoryStore(): ReferralTokenMemoryStore {
  if (!globalThis.__autohireReferralTokenStore) {
    globalThis.__autohireReferralTokenStore = { tokens: [] };
  }
  return globalThis.__autohireReferralTokenStore;
}

export async function findReferralTokenForExpert(
  expertId: string,
): Promise<ReferralTokenRecord | null> {
  if (getRuntimeMode() === "memory") {
    return (
      memoryStore()
        .tokens.filter((token) => token.expertId === expertId)
        .sort(
          (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
        )[0] ?? null
    );
  }

  const { prisma } = await import("@/lib/db/prisma");
  const record = await prisma.referralToken.findFirst({
    where: { expertId },
    orderBy: { createdAt: "desc" },
  });
  if (!record) {
    return null;
  }

  return {
    ...record,
    displayFields: referralDisplayFieldsSchema.parse(record.displayFields),
  };
}

export async function createReferralTokenRecord(
  input: CreateReferralTokenRecordInput,
): Promise<ReferralTokenRecord | null> {
  if (getRuntimeMode() === "memory") {
    const store = memoryStore();
    for (const token of store.tokens) {
      if (token.expertId === input.expertId && token.status === "ACTIVE") {
        return null;
      }
    }

    const record: ReferralTokenRecord = {
      id: randomUUID(),
      applicationId: input.applicationId,
      expertId: input.expertId,
      tokenHash: input.tokenHash,
      displayFields: input.displayFields,
      status: "ACTIVE",
      expiredAt: input.expiredAt,
      createdBy: input.createdBy,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    };
    store.tokens.push(record);
    return record;
  }

  const { prisma } = await import("@/lib/db/prisma");
  try {
    return await runReferralWriteTransaction(prisma, async (transaction) => {
      const active = await transaction.referralToken.findFirst({
        where: { expertId: input.expertId, status: "ACTIVE" },
        select: { id: true },
      });
      if (active) {
        return null;
      }

      const record = await transaction.referralToken.create({ data: input });
      return {
        ...record,
        displayFields: referralDisplayFieldsSchema.parse(record.displayFields),
      };
    });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      return null;
    }
    throw error;
  }
}

export async function replaceReferralTokenRecord(
  input: CreateReferralTokenRecordInput,
): Promise<ReferralTokenRecord> {
  if (getRuntimeMode() === "memory") {
    const store = memoryStore();
    for (let index = 0; index < store.tokens.length; index += 1) {
      const existing = store.tokens[index];
      if (
        existing?.expertId === input.expertId &&
        existing.status === "ACTIVE"
      ) {
        store.tokens[index] = {
          ...existing,
          status: "DISABLED",
          updatedAt: input.createdAt,
        };
      }
    }

    const record: ReferralTokenRecord = {
      id: randomUUID(),
      applicationId: input.applicationId,
      expertId: input.expertId,
      tokenHash: input.tokenHash,
      displayFields: input.displayFields,
      status: "ACTIVE",
      expiredAt: input.expiredAt,
      createdBy: input.createdBy,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    };
    store.tokens.push(record);
    return record;
  }

  const { prisma } = await import("@/lib/db/prisma");
  return runReferralWriteTransaction(prisma, async (transaction) => {
    await transaction.referralToken.updateMany({
      where: { expertId: input.expertId, status: "ACTIVE" },
      data: { status: "DISABLED" },
    });
    const record = await transaction.referralToken.create({ data: input });
    return {
      ...record,
      displayFields: referralDisplayFieldsSchema.parse(record.displayFields),
    };
  });
}

export async function disableActiveReferralToken(
  expertId: string,
): Promise<ReferralTokenRecord | null> {
  if (getRuntimeMode() === "memory") {
    const tokens = memoryStore().tokens;
    const index = tokens.findIndex(
      (token) => token.expertId === expertId && token.status === "ACTIVE",
    );
    const existing = tokens[index];
    if (!existing) {
      return null;
    }

    const updated = {
      ...existing,
      status: "DISABLED" as const,
      updatedAt: new Date(),
    };
    tokens[index] = updated;
    return updated;
  }

  const { prisma } = await import("@/lib/db/prisma");
  return runReferralWriteTransaction(prisma, async (transaction) => {
    const existing = await transaction.referralToken.findFirst({
      where: { expertId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
    if (!existing) {
      return null;
    }

    const record = await transaction.referralToken.update({
      where: { id: existing.id },
      data: { status: "DISABLED" },
    });
    return {
      ...record,
      displayFields: referralDisplayFieldsSchema.parse(record.displayFields),
    };
  });
}

export async function renewActiveReferralToken(input: {
  readonly expertId: string;
  readonly lifetimeDays: number;
}): Promise<ReferralTokenRecord | null> {
  const renewedAt = new Date();

  if (getRuntimeMode() === "memory") {
    const tokens = memoryStore().tokens;
    const index = tokens.findIndex(
      (token) => token.expertId === input.expertId && token.status === "ACTIVE",
    );
    const existing = tokens[index];
    if (!existing) {
      return null;
    }

    const expiredAt = new Date(
      Math.max(existing.expiredAt.getTime(), renewedAt.getTime()),
    );
    expiredAt.setUTCDate(expiredAt.getUTCDate() + input.lifetimeDays);
    const updated = { ...existing, expiredAt, updatedAt: renewedAt };
    tokens[index] = updated;
    return updated;
  }

  const { prisma } = await import("@/lib/db/prisma");
  return runReferralWriteTransaction(prisma, async (transaction) => {
    const existing = await transaction.referralToken.findFirst({
      where: { expertId: input.expertId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
    if (!existing) {
      return null;
    }

    const expiredAt = new Date(
      Math.max(existing.expiredAt.getTime(), renewedAt.getTime()),
    );
    expiredAt.setUTCDate(expiredAt.getUTCDate() + input.lifetimeDays);
    const record = await transaction.referralToken.update({
      where: { id: existing.id },
      data: { expiredAt },
    });
    return {
      ...record,
      displayFields: referralDisplayFieldsSchema.parse(record.displayFields),
    };
  });
}
