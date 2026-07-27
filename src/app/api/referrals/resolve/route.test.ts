import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { GET as resolveReferral } from "@/app/api/referrals/resolve/route";
import { GET as captureContext } from "@/app/api/referrals/context/route";
import { createReferralTokenRecord } from "@/lib/referral-tokens/repository";
import { issueReferralTokenMaterial } from "@/lib/referral-tokens/token";
import { REFERRAL_CONTEXT_COOKIE_NAME } from "@/lib/referral-tokens/context-cookie";
import { setupReferralTokenRouteTests } from "@/app/api/ops/referral-tokens/referral-token-route-fixture";

setupReferralTokenRouteTests();

async function seedToken(input?: {
  status?: "ACTIVE" | "DISABLED";
  expiredAt?: Date;
}) {
  const issued = issueReferralTokenMaterial();
  const record = await createReferralTokenRecord({
    referrerEmail: "referrer@example.com",
    referrerDisplayName: "王五",
    tokenHash: issued.tokenHash,
    plaintextToken: issued.plaintextToken,
    expiredAt: input?.expiredAt ?? issued.expiredAt,
    createdBy: "ops-test",
    createdAt: issued.createdAt,
  });
  if (!record) throw new Error("seed failed");
  if (input?.status === "DISABLED") {
    const { disableReferralTokenById } = await import(
      "@/lib/referral-tokens/repository"
    );
    await disableReferralTokenById(record.id);
  }
  return { record, plaintextToken: issued.plaintextToken };
}

describe("GET /api/referrals/resolve", () => {
  it("returns VALID without referrer PII and records a click", async () => {
    const { plaintextToken } = await seedToken();
    const response = await resolveReferral(
      new NextRequest(
        `http://localhost/api/referrals/resolve?t=${plaintextToken}`,
        { headers: { "x-forwarded-for": "203.0.113.10" } },
      ),
    );
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toEqual({ status: "VALID" });
    expect(payload).not.toHaveProperty("expert");
    expect(payload).not.toHaveProperty("referrerEmail");

    const logs =
      (
        globalThis as typeof globalThis & {
          __autohireReferralClickLogStore?: {
            logs: Array<{ accessResult: string }>;
          };
        }
      ).__autohireReferralClickLogStore?.logs ?? [];
    expect(logs.at(-1)?.accessResult).toBe("VALID");
  });

  it("returns UNAVAILABLE for disabled tokens", async () => {
    const { plaintextToken } = await seedToken({ status: "DISABLED" });
    const response = await resolveReferral(
      new NextRequest(
        `http://localhost/api/referrals/resolve?t=${plaintextToken}`,
      ),
    );
    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toMatchObject({
      status: "UNAVAILABLE",
    });
  });
});

describe("GET /api/referrals/context", () => {
  it("sets referral cookie and redirects to signup with resume next", async () => {
    const { plaintextToken } = await seedToken();
    const response = await captureContext(
      new NextRequest(
        `http://localhost/api/referrals/context?t=${plaintextToken}`,
      ),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/signup?next=%2Fapply%2Fresume",
    );
    expect(response.headers.get("set-cookie")).toContain(
      `${REFERRAL_CONTEXT_COOKIE_NAME}=${plaintextToken}`,
    );
  });
});
