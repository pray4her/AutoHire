import { randomUUID } from "node:crypto";

import { getRuntimeMode } from "@/lib/env";
import {
  referralDisplayFieldSelectionSchema,
  type ReferralDisplayField,
} from "@/lib/referral-tokens/schemas";
import type { ReferralTokenRecord } from "@/lib/referral-tokens/types";

export type ReferralClickAccessResult =
  | "VALID"
  | "INVALID"
  | "EXPIRED"
  | "DISABLED";

type ReferralClickLogRecord = {
  readonly id: string;
  readonly referralTokenId: string | null;
  readonly tokenHash: string;
  readonly accessResult: ReferralClickAccessResult;
  readonly ipRaw: string | null;
  readonly userAgent: string | null;
  readonly createdAt: Date;
};

type ReferralClickLogMemoryStore = {
  readonly logs: ReferralClickLogRecord[];
};

declare global {
  var __autohireReferralClickLogStore: ReferralClickLogMemoryStore | undefined;
}

function clickLogMemoryStore(): ReferralClickLogMemoryStore {
  if (!globalThis.__autohireReferralClickLogStore) {
    globalThis.__autohireReferralClickLogStore = { logs: [] };
  }
  return globalThis.__autohireReferralClickLogStore;
}

export function parsePublicReferralDisplayFields(
  value: unknown,
): readonly ReferralDisplayField[] | null {
  const parsed = referralDisplayFieldSelectionSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export async function findReferralTokenByHash(
  tokenHash: string,
): Promise<ReferralTokenRecord | null> {
  if (getRuntimeMode() === "memory") {
    return (
      globalThis.__autohireReferralTokenStore?.tokens.find(
        (token) => token.tokenHash === tokenHash,
      ) ?? null
    );
  }

  const { prisma } = await import("@/lib/db/prisma");
  const record = await prisma.referralToken.findUnique({
    where: { tokenHash },
  });
  if (!record) {
    return null;
  }

  const displayFields = parsePublicReferralDisplayFields(record.displayFields);
  if (!displayFields) {
    return null;
  }

  return {
    ...record,
    displayFields,
  };
}

export async function recordReferralClick(input: {
  readonly referralTokenId: string | null;
  readonly tokenHash: string;
  readonly accessResult: ReferralClickAccessResult;
  readonly ipRaw: string | null;
  readonly userAgent: string | null;
}): Promise<void> {
  if (getRuntimeMode() === "memory") {
    clickLogMemoryStore().logs.push({
      id: randomUUID(),
      ...input,
      createdAt: new Date(),
    });
    return;
  }

  const { prisma } = await import("@/lib/db/prisma");
  await prisma.referralTokenClickLog.create({ data: input });
}
