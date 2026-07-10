import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "@/app/api/ops/expert-files/route";
import { resetEnvForTests } from "@/lib/env";

describe("GET /api/ops/expert-files", () => {
  beforeEach(() => {
    process.env.AUDIT_DASHBOARD_TOKENS = "ops-token";
    process.env.INVITE_TOKEN_SECRET = "ops-route-secret";
    resetEnvForTests();
  });

  it("requires an ops session cookie", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/ops/expert-files"),
    );
    expect(response.status).toBe(401);
    const payload = await response.json();
    expect(payload.code).toBe("OPS_SESSION_REQUIRED");
  });
});
