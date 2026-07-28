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
    expect(
      storedReferralTokens().filter((t) => t.status === "ACTIVE"),
    ).toHaveLength(1);
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

  it("scopes list, mutations and downstream to the ops account that created the token", async () => {
    const cookie = await authCookieHeader();
    const created = await generate(
      new NextRequest("http://localhost/api/ops/referral-tokens/generate", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ entries: [{ email: "mine@example.com" }] }),
      }),
    );
    const createdPayload = (await created.json()) as {
      results: Array<{ token: { id: string } }>;
    };
    const ownTokenId = createdPayload.results[0]!.token.id;

    // A token owned by a different ops account digest (inserted directly —
    // the generate route always stamps the current session's digest).
    const { createReferralTokenRecord } =
      await import("@/lib/referral-tokens/repository");
    const { issueReferralTokenMaterial } =
      await import("@/lib/referral-tokens/token");
    const issued = issueReferralTokenMaterial();
    const foreign = await createReferralTokenRecord({
      referrerEmail: "foreign@example.com",
      referrerDisplayName: null,
      tokenHash: issued.tokenHash,
      plaintextToken: issued.plaintextToken,
      expiredAt: issued.expiredAt,
      createdBy: "another-ops-account-digest",
      createdAt: issued.createdAt,
    });
    expect(foreign).not.toBeNull();

    const { GET: downstream } =
      await import("@/app/api/ops/referral-tokens/[tokenId]/downstream/route");

    // List only returns the caller's own tokens.
    const listed = await listTokens(
      new NextRequest("http://localhost/api/ops/referral-tokens", {
        headers: { cookie },
      }),
    );
    const listedPayload = (await listed.json()) as {
      items: Array<{ id: string }>;
    };
    expect(listedPayload.items.map((item) => item.id)).toEqual([ownTokenId]);

    // Mutations against another account's token are unavailable (404).
    for (const action of ["DISABLE", "RENEW", "REGENERATE"] as const) {
      const response = await mutateToken(
        new NextRequest(
          `http://localhost/api/ops/referral-tokens/${foreign!.id}`,
          {
            method: "PATCH",
            headers: { cookie, "content-type": "application/json" },
            body: JSON.stringify({ action }),
          },
        ),
        { params: Promise.resolve({ tokenId: foreign!.id }) },
      );
      expect(response.status).toBe(404);
    }

    // Downstream expansion of another account's token is unavailable too.
    const downstreamResponse = await downstream(
      new NextRequest(
        `http://localhost/api/ops/referral-tokens/${foreign!.id}/downstream`,
        { headers: { cookie } },
      ),
      { params: Promise.resolve({ tokenId: foreign!.id }) },
    );
    expect(downstreamResponse.status).toBe(404);

    // The foreign token is untouched.
    expect(
      storedReferralTokens().find((token) => token.id === foreign!.id),
    ).toMatchObject({ status: "ACTIVE" });

    // Own token remains fully operable.
    const ownRenew = await mutateToken(
      new NextRequest(
        `http://localhost/api/ops/referral-tokens/${ownTokenId}`,
        {
          method: "PATCH",
          headers: { cookie, "content-type": "application/json" },
          body: JSON.stringify({ action: "RENEW" }),
        },
      ),
      { params: Promise.resolve({ tokenId: ownTokenId }) },
    );
    expect(ownRenew.status).toBe(200);
  });

  it("lets different Ops Accounts each hold an ACTIVE token for the same referrer email", async () => {
    const opsCookie = await authCookieHeader("ops");
    const aliceCookie = await authCookieHeader("alice");

    const opsCreated = await generate(
      new NextRequest("http://localhost/api/ops/referral-tokens/generate", {
        method: "POST",
        headers: { cookie: opsCookie, "content-type": "application/json" },
        body: JSON.stringify({ entries: [{ email: "shared@example.com" }] }),
      }),
    );
    expect(opsCreated.status).toBe(201);
    const opsPayload = (await opsCreated.json()) as {
      results: Array<{ skipped: boolean; plaintextToken: string; token: { id: string } }>;
    };
    expect(opsPayload.results[0]?.skipped).toBe(false);

    const aliceCreated = await generate(
      new NextRequest("http://localhost/api/ops/referral-tokens/generate", {
        method: "POST",
        headers: { cookie: aliceCookie, "content-type": "application/json" },
        body: JSON.stringify({ entries: [{ email: "shared@example.com" }] }),
      }),
    );
    expect(aliceCreated.status).toBe(201);
    const alicePayload = (await aliceCreated.json()) as {
      results: Array<{ skipped: boolean; plaintextToken: string; token: { id: string } }>;
    };
    expect(alicePayload.results[0]?.skipped).toBe(false);
    expect(alicePayload.results[0]?.plaintextToken).not.toBe(
      opsPayload.results[0]?.plaintextToken,
    );

    const opsList = await listTokens(
      new NextRequest("http://localhost/api/ops/referral-tokens", {
        headers: { cookie: opsCookie },
      }),
    );
    const aliceList = await listTokens(
      new NextRequest("http://localhost/api/ops/referral-tokens", {
        headers: { cookie: aliceCookie },
      }),
    );
    await expect(opsList.json()).resolves.toMatchObject({
      items: [{ id: opsPayload.results[0]!.token.id }],
    });
    await expect(aliceList.json()).resolves.toMatchObject({
      items: [{ id: alicePayload.results[0]!.token.id }],
    });

    expect(
      storedReferralTokens().filter(
        (token) =>
          token.referrerEmail === "shared@example.com" &&
          token.status === "ACTIVE",
      ),
    ).toHaveLength(2);
  });
});
