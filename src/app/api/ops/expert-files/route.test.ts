import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "@/app/api/ops/expert-files/route";
import { POST as login } from "@/app/api/ops/expert-files/auth/login/route";
import { resetOpsExpertFilesAccountsForTests } from "@/lib/ops-expert-files/account-auth";
import { getOpsExpertFilesCookieName } from "@/lib/ops-expert-files/session";
import { resetEnvForTests } from "@/lib/env";

const originalEnv = { ...process.env };

describe("GET /api/ops/expert-files", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      APP_RUNTIME_MODE: "memory",
      INVITE_TOKEN_SECRET: "ops-route-secret",
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

  it("requires an expert-files session cookie", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/ops/expert-files"),
    );
    expect(response.status).toBe(401);
    const payload = await response.json();
    expect(payload.code).toBe("OPS_EXPERT_FILES_SESSION_REQUIRED");
  });

  it("accepts a password-login session cookie", async () => {
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

    const setCookie = loginResponse.headers.get("set-cookie") ?? "";
    const cookieValue =
      setCookie.match(
        new RegExp(`${getOpsExpertFilesCookieName()}=([^;]+)`),
      )?.[1] ?? "";
    expect(cookieValue).toBeTruthy();

    const response = await GET(
      new NextRequest("http://localhost/api/ops/expert-files", {
        headers: {
          cookie: `${getOpsExpertFilesCookieName()}=${cookieValue}`,
        },
      }),
    );
    expect(response.status).toBe(200);
  });
});
