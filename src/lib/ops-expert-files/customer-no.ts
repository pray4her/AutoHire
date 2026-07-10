import { getRuntimeMode } from "@/lib/env";
import {
  buildCustomerNo,
  CustomerNoQuotaExceededError,
  formatShanghaiDateKey,
} from "@/lib/ops-expert-files/time";
import { CUSTOMER_NO_MAX_DAILY_SEQ } from "@/lib/ops-expert-files/constants";

type CounterStore = Map<string, number>;

declare global {
  var __autohireCustomerNoCounters: CounterStore | undefined;
}

function getMemoryCounters() {
  if (!globalThis.__autohireCustomerNoCounters) {
    globalThis.__autohireCustomerNoCounters = new Map();
  }

  return globalThis.__autohireCustomerNoCounters;
}

export async function allocateCustomerNo(input: {
  resumeUploadedAt: Date;
}): Promise<string> {
  const dateKey = formatShanghaiDateKey(input.resumeUploadedAt);

  if (getRuntimeMode() === "memory") {
    const counters = getMemoryCounters();
    const next = (counters.get(dateKey) ?? 0) + 1;
    if (next > CUSTOMER_NO_MAX_DAILY_SEQ) {
      throw new CustomerNoQuotaExceededError(dateKey);
    }
    counters.set(dateKey, next);
    return buildCustomerNo(dateKey, next);
  }

  const { prisma } = await import("@/lib/db/prisma");

  return prisma.$transaction(async (tx) => {
    const existing = await tx.customerNoDailyCounter.findUnique({
      where: { dateKey },
    });

    if (!existing) {
      const created = await tx.customerNoDailyCounter.create({
        data: { dateKey, lastSeq: 1 },
      });
      return buildCustomerNo(dateKey, created.lastSeq);
    }

    if (existing.lastSeq >= CUSTOMER_NO_MAX_DAILY_SEQ) {
      throw new CustomerNoQuotaExceededError(dateKey);
    }

    const updated = await tx.customerNoDailyCounter.update({
      where: { dateKey },
      data: { lastSeq: { increment: 1 } },
    });

    if (updated.lastSeq > CUSTOMER_NO_MAX_DAILY_SEQ) {
      throw new CustomerNoQuotaExceededError(dateKey);
    }

    return buildCustomerNo(dateKey, updated.lastSeq);
  });
}

export function resetCustomerNoCountersForTests() {
  if (process.env.NODE_ENV !== "test") {
    return;
  }

  globalThis.__autohireCustomerNoCounters = new Map();
}
