import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { POST as changePassword } from "@/app/api/ops/expert-files/auth/change-password/route";
import { POST as login } from "@/app/api/ops/expert-files/auth/login/route";
import { POST as logout } from "@/app/api/ops/expert-files/auth/logout/route";
import { resetOpsExpertFilesAccountsForTests } from "@/lib/ops-expert-files/account-auth";
import { getOpsExpertFilesCookieName } from "@/lib/ops-expert-files/session";
import { resetEnvForTests } from "@/lib/env";

const originalEnv = { ...process.env };

function readCookie(setCookie: string) {
  return (
    setCookie.match(
      new RegExp(`${getOpsExpertFilesCookieName()}=([^;]+)`),
    )?.[1] ?? ""
  );
}

describe("ops expert-files auth routes", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      APP_RUNTIME_MODE: "memory",
      INVITE_TOKEN_SECRET: "ops-auth-route-secret",
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

  it("logs in, changes password, and clears cookie on logout", async () => {
    const loginResponse = await login(
      new NextRequest("http://localhost/api/ops/expert-files/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: "ops",
          password: "initial-pass-123",
        }),
      }),
    );
    expect(loginResponse.status).toBe(200);
    const cookieValue = readCookie(loginResponse.headers.get("set-cookie") ?? "");

    const changeResponse = await changePassword(
      new NextRequest(
        "http://localhost/api/ops/expert-files/auth/change-password",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie: `${getOpsExpertFilesCookieName()}=${cookieValue}`,
          },
          body: JSON.stringify({
            currentPassword: "initial-pass-123",
            newPassword: "new-pass-4567",
          }),
        },
      ),
    );
    expect(changeResponse.status).toBe(200);
    expect(changeResponse.headers.get("set-cookie")).toContain(
      getOpsExpertFilesCookieName(),
    );

    const logoutResponse = await logout(
      new NextRequest("http://localhost/api/ops/expert-files/auth/logout", {
        method: "POST",
      }),
    );
    expect(logoutResponse.status).toBe(200);
    const logoutCookie = logoutResponse.headers.get("set-cookie") ?? "";
    expect(logoutCookie).toContain(`${getOpsExpertFilesCookieName()}=`);
    expect(logoutCookie.toLowerCase()).toContain("max-age=0");
  });
});
