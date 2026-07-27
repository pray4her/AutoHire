import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { GET } from "@/app/api/referrals/resolve/route";
import { resetEnvForTests } from "@/lib/env";
import { hashReferralToken } from "@/lib/referral-tokens/token";

const originalEnv = { ...process.env };

const clickLogStoreSchema = z.object({
  logs: z.array(
    z.object({
      tokenHash: z.string(),
      accessResult: z.string(),
      ipRaw: z.string().nullable(),
      userAgent: z.string().nullable(),
      createdAt: z.date(),
    }),
  ),
});

describe("malformed public referral tokens", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      APP_RUNTIME_MODE: "memory",
      APP_BASE_URL: "https://example.test",
      INVITE_TOKEN_SECRET: "public-referral-route-secret",
    };
    resetEnvForTests();
    globalThis.__autohireReferralTokenStore = undefined;
    Reflect.deleteProperty(globalThis, "__autohireReferralClickLogStore");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    resetEnvForTests();
    globalThis.__autohireReferralTokenStore = undefined;
    Reflect.deleteProperty(globalThis, "__autohireReferralClickLogStore");
  });

  it("records a malformed click before returning the unified response", async () => {
    // Given
    const malformedToken = "not-a-referral-token";

    // When
    const response = await GET(
      new NextRequest(
        `http://localhost/api/referrals/resolve?t=${malformedToken}`,
        {
          headers: {
            "x-real-ip": "198.51.100.7",
            "user-agent": "malformed-referral-test",
          },
        },
      ),
    );

    // Then
    expect(response.status).toBe(410);
    const store = clickLogStoreSchema.parse(
      Reflect.get(globalThis, "__autohireReferralClickLogStore"),
    );
    expect(store.logs).toHaveLength(1);
    expect(store.logs[0]).toMatchObject({
      tokenHash: hashReferralToken(malformedToken),
      accessResult: "INVALID",
      ipRaw: "198.51.100.7",
      userAgent: "malformed-referral-test",
      createdAt: expect.any(Date),
    });
  });

  it("keeps the public response available when click logging fails", async () => {
    // Given
    Reflect.set(globalThis, "__autohireReferralClickLogStore", {
      logs: Object.freeze([]),
    });
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

    // When
    const response = await GET(
      new NextRequest("http://localhost/api/referrals/resolve?t=malformed"),
    );

    // Then
    expect(response.status).toBe(410);
    expect(errorLog).toHaveBeenCalledOnce();
  });
});
