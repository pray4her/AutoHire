import { randomUUID } from "node:crypto";

import { getRuntimeMode } from "@/lib/env";
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

  return record;
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
