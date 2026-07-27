import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { GET } from "@/app/api/referrals/resolve/route";
import { getApplicationById } from "@/lib/data/store";
import { resetEnvForTests } from "@/lib/env";
import { createReferralTokenRecord } from "@/lib/referral-tokens/repository";
import { disableActiveReferralToken } from "@/lib/referral-tokens/repository";
import { hashReferralToken } from "@/lib/referral-tokens/token";

const REFERRAL_TOKEN = "a".repeat(64);
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

async function seedReferralToken(input: {
  readonly applicationId: string;
  readonly displayFields: readonly (
    | "NAME"
    | "TITLE"
    | "ORGANIZATION"
    | "EMAIL"
    | "PHONE"
  )[];
  readonly expiredAt?: Date;
}): Promise<void> {
  const application = await getApplicationById(input.applicationId);
  if (!application) {
    throw new Error(
      `Missing referral test application: ${input.applicationId}`,
    );
  }

  await createReferralTokenRecord({
    applicationId: application.id,
    expertId: application.expertId,
    tokenHash: hashReferralToken(REFERRAL_TOKEN),
    displayFields: input.displayFields,
    expiredAt: input.expiredAt ?? new Date("2099-01-01T00:00:00.000Z"),
    createdBy: "ops-test",
    createdAt: new Date("2026-07-27T00:00:00.000Z"),
  });
}

describe("public referral resolver route", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      APP_RUNTIME_MODE: "memory",
      APP_BASE_URL: "https://example.test",
      INVITE_TOKEN_SECRET: "public-referral-route-secret",
    };
    resetEnvForTests();
    globalThis.__autohireStore = undefined;
    globalThis.__autohireReferralTokenStore = undefined;
    Reflect.deleteProperty(globalThis, "__autohireReferralClickLogStore");
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetEnvForTests();
    globalThis.__autohireStore = undefined;
    globalThis.__autohireReferralTokenStore = undefined;
    Reflect.deleteProperty(globalThis, "__autohireReferralClickLogStore");
  });

  it("returns only fields selected by ops when the token is valid", async () => {
    // Given
    await seedReferralToken({
      applicationId: "app_progress",
      displayFields: ["NAME"],
    });

    // When
    const response = await GET(
      new NextRequest(
        `http://localhost/api/referrals/resolve?t=${REFERRAL_TOKEN}`,
      ),
    );

    // Then
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "VALID",
      expert: { name: "Progress Expert" },
    });
  });

  it("returns selected fields from the expert resume extraction", async () => {
    // Given
    await seedReferralToken({
      applicationId: "app_extraction_review",
      displayFields: ["NAME", "TITLE", "EMAIL", "PHONE"],
    });

    // When
    const response = await GET(
      new NextRequest(
        `http://localhost/api/referrals/resolve?t=${REFERRAL_TOKEN}`,
      ),
    );

    // Then
    await expect(response.json()).resolves.toEqual({
      status: "VALID",
      expert: {
        name: "Extraction Review Expert",
        title: "Associate Professor",
        email: "extraction.review@example.com",
        phone: "+1 555 010 5000",
      },
    });
  });

  it("falls back to a dignified expert label when profile data is missing", async () => {
    // Given
    await seedReferralToken({
      applicationId: "app_intro",
      displayFields: ["NAME", "TITLE", "ORGANIZATION", "EMAIL", "PHONE"],
    });

    // When
    const response = await GET(
      new NextRequest(
        `http://localhost/api/referrals/resolve?t=${REFERRAL_TOKEN}`,
      ),
    );

    // Then
    await expect(response.json()).resolves.toEqual({
      status: "VALID",
      expert: { name: "一位 GESF 专家" },
    });
  });

  it("records a valid click with the token hash and request context", async () => {
    // Given
    await seedReferralToken({
      applicationId: "app_progress",
      displayFields: ["NAME"],
    });

    // When
    const beforeRequest = new Date();
    await GET(
      new NextRequest(
        `http://localhost/api/referrals/resolve?t=${REFERRAL_TOKEN}`,
        {
          headers: {
            "x-forwarded-for": "203.0.113.42, 10.0.0.1",
            "user-agent": "referral-route-test",
          },
        },
      ),
    );

    // Then
    const store = clickLogStoreSchema.parse(
      Reflect.get(globalThis, "__autohireReferralClickLogStore"),
    );
    expect(store.logs).toHaveLength(1);
    expect(store.logs[0]).toMatchObject({
      tokenHash: hashReferralToken(REFERRAL_TOKEN),
      accessResult: "VALID",
      ipRaw: "203.0.113.42",
      userAgent: "referral-route-test",
    });
    expect(store.logs[0]?.createdAt.getTime()).toBeGreaterThanOrEqual(
      beforeRequest.getTime(),
    );
  });

  it.each([
    { scenario: "missing", expectedResult: "INVALID" },
    { scenario: "expired", expectedResult: "EXPIRED" },
    { scenario: "disabled", expectedResult: "DISABLED" },
  ] as const)(
    "uses one unavailable response for a $scenario referral token",
    async ({ scenario, expectedResult }) => {
      // Given
      if (scenario !== "missing") {
        await seedReferralToken({
          applicationId: "app_progress",
          displayFields: ["NAME"],
          expiredAt:
            scenario === "expired"
              ? new Date("2020-01-01T00:00:00.000Z")
              : undefined,
        });
      }
      if (scenario === "disabled") {
        await disableActiveReferralToken("expert_progress");
      }

      // When
      const response = await GET(
        new NextRequest(
          `http://localhost/api/referrals/resolve?t=${REFERRAL_TOKEN}`,
        ),
      );

      // Then
      expect(response.status).toBe(410);
      await expect(response.json()).resolves.toEqual({
        status: "UNAVAILABLE",
        code: "REFERRAL_LINK_UNAVAILABLE",
      });
      const store = clickLogStoreSchema.parse(
        Reflect.get(globalThis, "__autohireReferralClickLogStore"),
      );
      expect(store.logs).toHaveLength(1);
      expect(store.logs[0]).toMatchObject({
        tokenHash: hashReferralToken(REFERRAL_TOKEN),
        accessResult: expectedResult,
        ipRaw: null,
        userAgent: null,
        createdAt: expect.any(Date),
      });
    },
  );
});
