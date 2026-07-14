import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  changeOpsExpertFilesPassword,
  loginOpsExpertFiles,
  resetOpsExpertFilesAccountsForTests,
  verifyOpsExpertFilesSession,
} from "@/lib/ops-expert-files/account-auth";
import { resetEnvForTests } from "@/lib/env";

const originalEnv = { ...process.env };

describe("ops expert-files account auth", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      APP_RUNTIME_MODE: "memory",
      INVITE_TOKEN_SECRET: "ops-expert-files-secret",
      OPS_EXPERT_FILES_USERNAME: "ops",
      OPS_EXPERT_FILES_INITIAL_PASSWORD: "initial-pass-123",
      OPS_EXPERT_FILES_COOKIE_NAME: "ops_ef_test_cookie",
      OPS_EXPERT_FILES_COOKIE_MAX_AGE_SECONDS: "300",
    };
    resetEnvForTests();
    resetOpsExpertFilesAccountsForTests();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetEnvForTests();
    resetOpsExpertFilesAccountsForTests();
  });

  it("creates the account from INITIAL_PASSWORD on first login", async () => {
    const result = await loginOpsExpertFiles({
      username: "ops",
      password: "initial-pass-123",
    });

    expect(result.username).toBe("ops");
    expect(result.passwordVersion).toBe(1);

    const session = await verifyOpsExpertFilesSession(result.cookieValue);
    expect(session?.username).toBe("ops");
  });

  it("rejects wrong password and wrong username", async () => {
    await expect(
      loginOpsExpertFiles({ username: "ops", password: "wrong" }),
    ).rejects.toMatchObject({ code: "OPS_EXPERT_FILES_INVALID_CREDENTIALS" });

    await expect(
      loginOpsExpertFiles({ username: "other", password: "initial-pass-123" }),
    ).rejects.toMatchObject({ code: "OPS_EXPERT_FILES_INVALID_CREDENTIALS" });
  });

  it("does not recreate account from INITIAL_PASSWORD after first login", async () => {
    await loginOpsExpertFiles({
      username: "ops",
      password: "initial-pass-123",
    });

    const changed = await changeOpsExpertFilesPassword({
      cookieValue: (
        await loginOpsExpertFiles({
          username: "ops",
          password: "initial-pass-123",
        })
      ).cookieValue,
      currentPassword: "initial-pass-123",
      newPassword: "new-pass-4567",
    });

    expect(changed.passwordVersion).toBe(2);

    await expect(
      loginOpsExpertFiles({
        username: "ops",
        password: "initial-pass-123",
      }),
    ).rejects.toMatchObject({ code: "OPS_EXPERT_FILES_INVALID_CREDENTIALS" });

    const again = await loginOpsExpertFiles({
      username: "ops",
      password: "new-pass-4567",
    });
    expect(again.passwordVersion).toBe(2);
  });

  it("invalidates old sessions after password change", async () => {
    const first = await loginOpsExpertFiles({
      username: "ops",
      password: "initial-pass-123",
    });

    const changed = await changeOpsExpertFilesPassword({
      cookieValue: first.cookieValue,
      currentPassword: "initial-pass-123",
      newPassword: "new-pass-4567",
    });

    expect(await verifyOpsExpertFilesSession(first.cookieValue)).toBeNull();
    expect(await verifyOpsExpertFilesSession(changed.cookieValue)).toMatchObject(
      {
        username: "ops",
        passwordVersion: 2,
      },
    );
  });

  it("fails when account is missing and INITIAL_PASSWORD is empty", async () => {
    process.env.OPS_EXPERT_FILES_INITIAL_PASSWORD = "";
    resetEnvForTests();

    await expect(
      loginOpsExpertFiles({ username: "ops", password: "anything" }),
    ).rejects.toMatchObject({
      code: "OPS_EXPERT_FILES_ACCOUNT_NOT_INITIALIZED",
    });
  });
});
