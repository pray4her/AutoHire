import { beforeEach, describe, expect, it } from "vitest";

import { ensureAccountApplication } from "@/lib/account-auth/shadow-invitation";
import { getApplicationById } from "@/lib/data/store";
import {
  createReferralTokenRecord,
  disableReferralTokenById,
  replaceReferralTokenRecord,
} from "@/lib/referral-tokens/repository";
import { issueReferralTokenMaterial } from "@/lib/referral-tokens/token";

function resetMemoryStores() {
  const globals = globalThis as typeof globalThis & {
    __autohireStore?: unknown;
    __autohireReferralTokenStore?: unknown;
    __autohireReferralClickLogStore?: unknown;
  };
  globals.__autohireStore = undefined;
  globals.__autohireReferralTokenStore = undefined;
  globals.__autohireReferralClickLogStore = undefined;
}

async function seedActiveReferralToken(email = "referrer@example.com") {
  const issued = issueReferralTokenMaterial();
  const record = await createReferralTokenRecord({
    referrerEmail: email,
    referrerDisplayName: "推荐人",
    tokenHash: issued.tokenHash,
    plaintextToken: issued.plaintextToken,
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
    process.env.APP_RUNTIME_MODE = "memory";
  });

  it("binds referral attribution when registration has a valid referral context", async () => {
    const { record, plaintextToken } = await seedActiveReferralToken();
    const result = await ensureAccountApplication({
      userId: "user_friend_1",
      email: "friend@example.com",
      referralPlaintextToken: plaintextToken,
    });
    const application = await getApplicationById(result.application.id);
    expect(application?.referralTokenId).toBe(record.id);
  });

  it("starts a referral-attributed application past the intro step", async () => {
    const { plaintextToken } = await seedActiveReferralToken();
    const result = await ensureAccountApplication({
      userId: "user_friend_intro",
      email: "friend-intro@example.com",
      referralPlaintextToken: plaintextToken,
    });
    // The referral landing presents the introduction and the applicant
    // confirms it there, so registration continues at the CV upload step
    // instead of bouncing through /apply again.
    const application = await getApplicationById(result.application.id);
    expect(application).toMatchObject({
      applicationStatus: "INTRO_VIEWED",
      currentStep: "resume",
    });
  });

  it("skips attribution when the referral token is disabled", async () => {
    const { record, plaintextToken } = await seedActiveReferralToken();
    await disableReferralTokenById(record.id);
    const result = await ensureAccountApplication({
      userId: "user_friend_2",
      email: "friend2@example.com",
      referralPlaintextToken: plaintextToken,
    });
    const application = await getApplicationById(result.application.id);
    expect(application?.referralTokenId).toBeNull();
    expect(application?.applicationStatus).toBe("INIT");
  });

  it("does not rewrite attribution on an existing account application", async () => {
    const first = await seedActiveReferralToken("one@example.com");
    const ensured = await ensureAccountApplication({
      userId: "user_friend_3",
      email: "friend3@example.com",
      referralPlaintextToken: first.plaintextToken,
    });
    const secondIssued = issueReferralTokenMaterial();
    await replaceReferralTokenRecord({
      referrerEmail: "two@example.com",
      referrerDisplayName: null,
      tokenHash: secondIssued.tokenHash,
      plaintextToken: secondIssued.plaintextToken,
      expiredAt: secondIssued.expiredAt,
      createdBy: "ops-test",
      createdAt: secondIssued.createdAt,
    });
    await ensureAccountApplication({
      userId: "user_friend_3",
      email: "friend3@example.com",
      referralPlaintextToken: secondIssued.plaintextToken,
    });
    const application = await getApplicationById(ensured.application.id);
    expect(application?.referralTokenId).toBe(first.record.id);
  });
});
