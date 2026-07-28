import { randomUUID } from "node:crypto";

import { getRuntimeMode } from "@/lib/env";
import {
  isPrismaUniqueConstraintError,
  runReferralWriteTransaction,
} from "@/lib/referral-tokens/prisma-write";
import type { ReferralTokenRecord } from "@/lib/referral-tokens/types";

type Store = { tokens: ReferralTokenRecord[] };
type CreateInput = Omit<ReferralTokenRecord, "id" | "status" | "updatedAt">;

declare global {
  var __autohireReferralTokenStore: Store | undefined;
}

function memoryStore(): Store {
  globalThis.__autohireReferralTokenStore ??= { tokens: [] };
  return globalThis.__autohireReferralTokenStore;
}

export async function findReferralTokenById(id: string) {
  if (getRuntimeMode() === "memory") {
    return memoryStore().tokens.find((token) => token.id === id) ?? null;
  }
  const { prisma } = await import("@/lib/db/prisma");
  return prisma.referralToken.findUnique({ where: { id } });
}

export async function findActiveReferralTokenByEmail(
  referrerEmail: string,
  createdBy: string,
) {
  if (getRuntimeMode() === "memory") {
    return (
      memoryStore().tokens.find(
        (token) =>
          token.referrerEmail === referrerEmail &&
          token.createdBy === createdBy &&
          token.status === "ACTIVE",
      ) ?? null
    );
  }
  const { prisma } = await import("@/lib/db/prisma");
  return prisma.referralToken.findFirst({
    where: { referrerEmail, createdBy, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
}

export async function listReferralTokens(
  createdBy?: string,
): Promise<ReferralTokenRecord[]> {
  if (getRuntimeMode() === "memory") {
    return [...memoryStore().tokens]
      .filter((token) => !createdBy || token.createdBy === createdBy)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  const { prisma } = await import("@/lib/db/prisma");
  return prisma.referralToken.findMany({
    where: createdBy ? { createdBy } : undefined,
    orderBy: { createdAt: "desc" },
  });
}

export async function createReferralTokenRecord(
  input: CreateInput,
): Promise<ReferralTokenRecord | null> {
  if (getRuntimeMode() === "memory") {
    const store = memoryStore();
    if (
      store.tokens.some(
        (token) =>
          token.referrerEmail === input.referrerEmail &&
          token.createdBy === input.createdBy &&
          token.status === "ACTIVE",
      )
    ) {
      return null;
    }
    const record: ReferralTokenRecord = {
      ...input,
      id: randomUUID(),
      status: "ACTIVE",
      updatedAt: input.createdAt,
    };
    store.tokens.push(record);
    return record;
  }

  const { prisma } = await import("@/lib/db/prisma");
  try {
    return await runReferralWriteTransaction(prisma, async (transaction) => {
      const active = await transaction.referralToken.findFirst({
        where: {
          referrerEmail: input.referrerEmail,
          createdBy: input.createdBy,
          status: "ACTIVE",
        },
        select: { id: true },
      });
      if (active) return null;
      return await transaction.referralToken.create({ data: input });
    });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) return null;
    throw error;
  }
}

export async function disableReferralTokenById(id: string) {
  if (getRuntimeMode() === "memory") {
    const tokens = memoryStore().tokens;
    const index = tokens.findIndex((token) => token.id === id);
    const existing = tokens[index];
    if (!existing) return null;
    const record = {
      ...existing,
      status: "DISABLED" as const,
      updatedAt: new Date(),
    };
    tokens[index] = record;
    return record;
  }
  const { prisma } = await import("@/lib/db/prisma");
  try {
    return await prisma.referralToken.update({
      where: { id },
      data: { status: "DISABLED" },
    });
  } catch {
    return null;
  }
}

export async function renewReferralTokenById(input: {
  id: string;
  lifetimeDays: number;
}) {
  const now = new Date();
  const record = await findReferralTokenById(input.id);
  if (!record || record.status !== "ACTIVE") return null;
  const expiredAt = new Date(
    Math.max(now.getTime(), record.expiredAt.getTime()),
  );
  expiredAt.setUTCDate(expiredAt.getUTCDate() + input.lifetimeDays);
  if (getRuntimeMode() === "memory") {
    const tokens = memoryStore().tokens;
    const index = tokens.findIndex((token) => token.id === input.id);
    const updated = { ...record, expiredAt, updatedAt: now };
    tokens[index] = updated;
    return updated;
  }
  const { prisma } = await import("@/lib/db/prisma");
  return await prisma.referralToken.update({
    where: { id: input.id },
    data: { expiredAt },
  });
}

export async function replaceReferralTokenRecord(input: CreateInput) {
  if (getRuntimeMode() === "memory") {
    for (const token of memoryStore().tokens) {
      if (
        token.referrerEmail === input.referrerEmail &&
        token.createdBy === input.createdBy &&
        token.status === "ACTIVE"
      ) {
        Object.assign(token, {
          status: "DISABLED",
          updatedAt: input.createdAt,
        });
      }
    }
    const record: ReferralTokenRecord = {
      ...input,
      id: randomUUID(),
      status: "ACTIVE",
      updatedAt: input.createdAt,
    };
    memoryStore().tokens.push(record);
    return record;
  }
  const { prisma } = await import("@/lib/db/prisma");
  return runReferralWriteTransaction(prisma, async (transaction) => {
    await transaction.referralToken.updateMany({
      where: {
        referrerEmail: input.referrerEmail,
        createdBy: input.createdBy,
        status: "ACTIVE",
      },
      data: { status: "DISABLED" },
    });
    return await transaction.referralToken.create({ data: input });
  });
}
