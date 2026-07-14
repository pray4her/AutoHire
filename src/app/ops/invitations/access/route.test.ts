import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "@/app/ops/invitations/access/route";
import { resetEnvForTests } from "@/lib/env";

const originalEnv = { ...process.env };

describe("GET /ops/invitations/access", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      APP_BASE_URL: "https://example.test",
      INVITE_TOKEN_SECRET: "ops-route-secret",
    };
    resetEnvForTests();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetEnvForTests();
  });

  it("redirects token links to the password login page", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/ops/invitations/access?token=ops-token",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://example.test/ops/invitations/login",
    );
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("prefers x-forwarded-host over the internal request URL", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/ops/invitations/access?token=anything",
        {
          headers: {
            "x-forwarded-host": "talent.1000help.com",
            "x-forwarded-proto": "https",
          },
        },
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://talent.1000help.com/ops/invitations/login",
    );
  });
});
