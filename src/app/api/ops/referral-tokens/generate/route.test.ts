import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { POST as generate } from "@/app/api/ops/referral-tokens/generate/route";
import { GET as listTokens } from "@/app/api/ops/referral-tokens/route";
import { PATCH as mutateToken } from "@/app/api/ops/referral-tokens/[tokenId]/route";
import { hashReferralToken } from "@/lib/referral-tokens/token";
import {
  authCookieHeader,
  setupReferralTokenRouteTests,
  storedReferralTokens,
} from "@/app/api/ops/referral-tokens/referral-token-route-fixture";

setupReferralTokenRouteTests();

describe("POST /api/ops/referral-tokens/generate", () => {
  it("rejects unauthenticated ops access", async () => {
    const response = await generate(
      new NextRequest("http://localhost/api/ops/referral-tokens/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entries: [{ email: "a@example.com" }] }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("generates a referrer-email token and skips conflicts", async () => {
    const cookie = await authCookieHeader();
    const first = await generate(
      new NextRequest("http://localhost/api/ops/referral-tokens/generate", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          entries: [{ email: "Referrer@Example.com", displayName: "李四" }],
        }),
      }),
    );
    expect(first.status).toBe(201);
    const firstPayload = (await first.json()) as {
      results: Array<{
        skipped: boolean;
        plaintextToken: string;
        referralLink: string;
        token: {
          referrerEmail: string;
          referrerDisplayName: string | null;
          status: string;
        };
      }>;
    };
    expect(firstPayload.results).toHaveLength(1);
    expect(firstPayload.results[0]).toMatchObject({
      skipped: false,
      token: {
        referrerEmail: "referrer@example.com",
        referrerDisplayName: "李四",
        status: "ACTIVE",
      },
    });
    expect(firstPayload.results[0]?.plaintextToken).toMatch(/^[0-9a-f]{64}$/);
    expect(firstPayload.results[0]?.referralLink).toContain("/referral?t=");
    expect(storedReferralTokens()[0]?.tokenHash).toBe(
      hashReferralToken(firstPayload.results[0]!.plaintextToken),
    );

    const second = await generate(
      new NextRequest("http://localhost/api/ops/referral-tokens/generate", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          entries: [{ email: "referrer@example.com", displayName: "Ignored" }],
        }),
      }),
    );
    expect(second.status).toBe(201);
    const secondPayload = (await second.json()) as {
      results: Array<{ skipped: boolean; plaintextToken: string }>;
    };
    expect(secondPayload.results[0]?.skipped).toBe(true);
    expect(secondPayload.results[0]?.plaintextToken).toBe(
      firstPayload.results[0]?.plaintextToken,
    );
    expect(storedReferralTokens().filter((t) => t.status === "ACTIVE")).toHaveLength(
      1,
    );
  });
});

describe("GET /api/ops/referral-tokens and PATCH lifecycle", () => {
  it("lists tokens with funnel and supports disable/renew/regenerate", async () => {
    const cookie = await authCookieHeader();
    const created = await generate(
      new NextRequest("http://localhost/api/ops/referral-tokens/generate", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ entries: [{ email: "ops@example.com" }] }),
      }),
    );
    const createdPayload = (await created.json()) as {
      results: Array<{ token: { id: string }; plaintextToken: string }>;
    };
    const tokenId = createdPayload.results[0]!.token.id;
    const originalPlaintext = createdPayload.results[0]!.plaintextToken;

    const listed = await listTokens(
      new NextRequest("http://localhost/api/ops/referral-tokens", {
        headers: { cookie },
      }),
    );
    expect(listed.status).toBe(200);
    await expect(listed.json()).resolves.toMatchObject({
      items: [
        {
          id: tokenId,
          referrerEmail: "ops@example.com",
          funnel: {
            clickCount: 0,
            registrationCount: 0,
            applicationCount: 0,
          },
        },
      ],
    });

    const renewed = await mutateToken(
      new NextRequest(`http://localhost/api/ops/referral-tokens/${tokenId}`, {
        method: "PATCH",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ action: "RENEW" }),
      }),
      { params: Promise.resolve({ tokenId }) },
    );
    expect(renewed.status).toBe(200);

    const regenerated = await mutateToken(
      new NextRequest(`http://localhost/api/ops/referral-tokens/${tokenId}`, {
        method: "PATCH",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ action: "REGENERATE" }),
      }),
      { params: Promise.resolve({ tokenId }) },
    );
    expect(regenerated.status).toBe(200);
    const regeneratedPayload = (await regenerated.json()) as {
      plaintextToken: string;
    };
    expect(regeneratedPayload.plaintextToken).not.toBe(originalPlaintext);
    expect(
      storedReferralTokens().filter((token) => token.status === "ACTIVE"),
    ).toHaveLength(1);

    const activeId = storedReferralTokens().find(
      (token) => token.status === "ACTIVE",
    )!.id;
    const disabled = await mutateToken(
      new NextRequest(`http://localhost/api/ops/referral-tokens/${activeId}`, {
        method: "PATCH",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ action: "DISABLE" }),
      }),
      { params: Promise.resolve({ tokenId: activeId }) },
    );
    expect(disabled.status).toBe(200);
    expect(
      storedReferralTokens().filter((token) => token.status === "ACTIVE"),
    ).toHaveLength(0);
  });
});
