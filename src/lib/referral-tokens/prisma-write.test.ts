import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  isPrismaUniqueConstraintError,
  type ReferralTransactionRunner,
  runReferralWriteTransaction,
} from "@/lib/referral-tokens/prisma-write";

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError("write failed", {
    code,
    clientVersion: "7.6.0",
  });
}

function transactionRunner(
  run: (
    operation: (transaction: Prisma.TransactionClient) => Promise<unknown>,
    attempt: number,
  ) => Promise<unknown>,
): { readonly runner: ReferralTransactionRunner; attempts: number } {
  const state = { attempts: 0 };
  const runner: ReferralTransactionRunner = {
    async $transaction<T>(operation): Promise<T> {
      state.attempts += 1;
      return (await run(operation, state.attempts)) as T;
    },
  };
  return {
    runner,
    get attempts() {
      return state.attempts;
    },
  };
}

describe("referral Prisma writes", () => {
  it("retries serialization conflicts before succeeding", async () => {
    const transaction = Object.create(null) as Prisma.TransactionClient;
    const subject = transactionRunner(async (operation, attempt) => {
      if (attempt < 3) {
        throw prismaError("P2034");
      }
      return operation(transaction);
    });

    await expect(
      runReferralWriteTransaction(subject.runner, async () => "saved"),
    ).resolves.toBe("saved");
    expect(subject.attempts).toBe(3);
  });

  it("stops after five serialization conflicts", async () => {
    const subject = transactionRunner(async () => {
      throw prismaError("P2034");
    });

    await expect(
      runReferralWriteTransaction(subject.runner, async () => "unreachable"),
    ).rejects.toMatchObject({ code: "P2034" });
    expect(subject.attempts).toBe(5);
  });

  it("propagates non-retryable errors immediately", async () => {
    const subject = transactionRunner(async () => {
      throw prismaError("P2025");
    });

    await expect(
      runReferralWriteTransaction(subject.runner, async () => "unreachable"),
    ).rejects.toMatchObject({ code: "P2025" });
    expect(subject.attempts).toBe(1);
  });

  it("recognizes Prisma unique-constraint errors", () => {
    expect(isPrismaUniqueConstraintError(prismaError("P2002"))).toBe(true);
    expect(isPrismaUniqueConstraintError(prismaError("P2025"))).toBe(false);
  });
});
