import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  changeOpsReferralPassword,
  loginOpsReferral,
  resetOpsReferralAccountsForTests,
  verifyOpsReferralSession,
} from "@/lib/ops-referral-auth/account-auth";
import { resetEnvForTests } from "@/lib/env";

const originalEnv = { ...process.env };

describe("ops referral account auth", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      APP_RUNTIME_MODE: "memory",
      INVITE_TOKEN_SECRET: "ops-referral-secret",
      OPS_REFERRAL_USERNAME: "ops",
      OPS_REFERRAL_INITIAL_PASSWORD: "initial-pass-123",
      OPS_REFERRAL_COOKIE_NAME: "ops_ref_test_cookie",
      OPS_REFERRAL_COOKIE_MAX_AGE_SECONDS: "300",
    };
    resetEnvForTests();
    resetOpsReferralAccountsForTests();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetEnvForTests();
    resetOpsReferralAccountsForTests();
  });

  it("creates the account from INITIAL_PASSWORD on first login", async () => {
    const result = await loginOpsReferral({
      username: "ops",
      password: "initial-pass-123",
    });

    expect(result.username).toBe("ops");
    expect(result.passwordVersion).toBe(1);

    const session = await verifyOpsReferralSession(result.cookieValue);
    expect(session?.username).toBe("ops");
  });

  it("rejects wrong password and wrong username", async () => {
    await expect(
      loginOpsReferral({ username: "ops", password: "wrong" }),
    ).rejects.toMatchObject({ code: "OPS_REFERRAL_INVALID_CREDENTIALS" });

    await expect(
      loginOpsReferral({ username: "other", password: "initial-pass-123" }),
    ).rejects.toMatchObject({ code: "OPS_REFERRAL_INVALID_CREDENTIALS" });
  });

  it("allows any username on the configured Referral Ops Account allowlist", async () => {
    process.env.OPS_REFERRAL_USERNAME = "ops, alice ,bob";
    resetEnvForTests();

    const alice = await loginOpsReferral({
      username: "alice",
      password: "initial-pass-123",
    });
    const bob = await loginOpsReferral({
      username: "bob",
      password: "initial-pass-123",
    });

    expect(alice.username).toBe("alice");
    expect(bob.username).toBe("bob");
    expect(alice.operatorDigest).not.toBe(bob.operatorDigest);
    expect(await verifyOpsReferralSession(alice.cookieValue)).toMatchObject({
      username: "alice",
    });
    expect(await verifyOpsReferralSession(bob.cookieValue)).toMatchObject({
      username: "bob",
    });
  });

  it("rejects sessions whose username leaves the allowlist", async () => {
    process.env.OPS_REFERRAL_USERNAME = "ops,alice";
    resetEnvForTests();

    const alice = await loginOpsReferral({
      username: "alice",
      password: "initial-pass-123",
    });

    process.env.OPS_REFERRAL_USERNAME = "ops";
    resetEnvForTests();

    expect(await verifyOpsReferralSession(alice.cookieValue)).toBeNull();
    await expect(
      loginOpsReferral({
        username: "alice",
        password: "initial-pass-123",
      }),
    ).rejects.toMatchObject({ code: "OPS_REFERRAL_INVALID_CREDENTIALS" });
  });

  it("invalidates old sessions after password change", async () => {
    const first = await loginOpsReferral({
      username: "ops",
      password: "initial-pass-123",
    });

    const changed = await changeOpsReferralPassword({
      cookieValue: first.cookieValue,
      currentPassword: "initial-pass-123",
      newPassword: "new-pass-4567",
    });

    expect(await verifyOpsReferralSession(first.cookieValue)).toBeNull();
    expect(await verifyOpsReferralSession(changed.cookieValue)).toMatchObject({
      username: "ops",
      passwordVersion: 2,
    });
  });

  it("fails when account is missing and INITIAL_PASSWORD is empty", async () => {
    process.env.OPS_REFERRAL_INITIAL_PASSWORD = "";
    resetEnvForTests();

    await expect(
      loginOpsReferral({ username: "ops", password: "anything" }),
    ).rejects.toMatchObject({
      code: "OPS_REFERRAL_ACCOUNT_NOT_INITIALIZED",
    });
  });
});
