import { beforeEach, describe, expect, it } from "vitest";

import { ensureAccountApplication } from "@/lib/account-auth/shadow-invitation";
import { getApplicationById } from "@/lib/data/store";
import { createReferralTokenRecord } from "@/lib/referral-tokens/repository";
import { issueReferralTokenMaterial } from "@/lib/referral-tokens/token";

function resetMemoryStores() {
  (
    globalThis as typeof globalThis & {
      __autohireStore?: unknown;
      __autohireReferralTokenStore?: unknown;
      __autohireReferralClickLogStore?: unknown;
    }
  ).__autohireStore = undefined;
  (
    globalThis as typeof globalThis & {
      __autohireReferralTokenStore?: unknown;
    }
  ).__autohireReferralTokenStore = undefined;
  (
    globalThis as typeof globalThis & {
      __autohireReferralClickLogStore?: unknown;
    }
  ).__autohireReferralClickLogStore = undefined;
}

async function seedActiveReferralToken() {
  const issued = issueReferralTokenMaterial();
  const record = await createReferralTokenRecord({
    applicationId: "app_intro",
    expertId: "expert_init",
    tokenHash: issued.tokenHash,
    displayFields: ["NAME"],
    expiredAt: issued.expiredAt,
    createdBy: "ops-test",
    createdAt: issued.createdAt,
  });
  if (!record) {
    throw new Error("failed to seed referral token");
  }
  return { record, plaintextToken: issued.plaintextToken };
}

describe("referral attribution on account registration", () => {
  beforeEach(() => {
    resetMemoryStores();
  });

  it("binds referral attribution when registration has a valid referral context", async () => {
    const { record, plaintextToken } = await seedActiveReferralToken();

    const { application } = await ensureAccountApplication({
      userId: "user_referred",
      email: "friend@example.com",
      referralPlaintextToken: plaintextToken,
    });

    expect(application.referralTokenId).toBe(record.id);
    const stored = await getApplicationById(application.id);
    expect(stored?.referralTokenId).toBe(record.id);
  });

  it("registers without attribution when referral context is absent", async () => {
    const { application } = await ensureAccountApplication({
      userId: "user_direct",
      email: "direct@example.com",
    });

    expect(application.referralTokenId).toBeNull();
  });

  it("registers without attribution and without error when referral context is disabled", async () => {
    const { record, plaintextToken } = await seedActiveReferralToken();
    const { disableActiveReferralToken } = await import(
      "@/lib/referral-tokens/repository"
    );
    await disableActiveReferralToken("expert_init");

    const { application } = await ensureAccountApplication({
      userId: "user_stale",
      email: "stale@example.com",
      referralPlaintextToken: plaintextToken,
    });

    expect(application.referralTokenId).toBeNull();
    expect(record.id).toBeTruthy();
  });

  it("does not rewrite attribution on later ensure calls with a different referral", async () => {
    const first = await seedActiveReferralToken();
    const { application } = await ensureAccountApplication({
      userId: "user_locked",
      email: "locked@example.com",
      referralPlaintextToken: first.plaintextToken,
    });
    expect(application.referralTokenId).toBe(first.record.id);

    const secondIssued = issueReferralTokenMaterial();
    // Replace the first token so a second ACTIVE token exists under a new hash.
    const { replaceReferralTokenRecord } = await import(
      "@/lib/referral-tokens/repository"
    );
    const second = await replaceReferralTokenRecord({
      applicationId: "app_intro",
      expertId: "expert_init",
      tokenHash: secondIssued.tokenHash,
      displayFields: ["NAME"],
      expiredAt: secondIssued.expiredAt,
      createdBy: "ops-test",
      createdAt: secondIssued.createdAt,
    });

    const again = await ensureAccountApplication({
      userId: "user_locked",
      email: "locked@example.com",
      referralPlaintextToken: secondIssued.plaintextToken,
    });

    expect(again.application.id).toBe(application.id);
    expect(again.application.referralTokenId).toBe(first.record.id);
    expect(second?.id).not.toBe(first.record.id);
  });

  it("does not backfill attribution onto an existing unattributed application", async () => {
    const { application } = await ensureAccountApplication({
      userId: "user_later",
      email: "later@example.com",
    });
    expect(application.referralTokenId).toBeNull();

    const { plaintextToken } = await seedActiveReferralToken();
    const again = await ensureAccountApplication({
      userId: "user_later",
      email: "later@example.com",
      referralPlaintextToken: plaintextToken,
    });

    expect(again.application.id).toBe(application.id);
    expect(again.application.referralTokenId).toBeNull();
  });
});
