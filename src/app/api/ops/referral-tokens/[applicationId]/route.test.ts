import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import {
  GET,
  PATCH,
  POST,
} from "@/app/api/ops/referral-tokens/[applicationId]/route";
import { hashReferralToken } from "@/lib/referral-tokens/token";
import {
  authCookieHeader,
  createPostRequest,
  seedSecondApplicationForExpert,
  setupReferralTokenRouteTests,
  storedReferralTokens,
} from "@/app/api/ops/referral-tokens/[applicationId]/referral-token-route-fixture";

describe("ops referral token routes", () => {
  setupReferralTokenRouteTests();

  it("rejects unauthenticated ops access", async () => {
    const context = { params: Promise.resolve({ applicationId: "app_intro" }) };
    const getResponse = await GET(
      new NextRequest("http://localhost/api/ops/referral-tokens/app_intro"),
      context,
    );
    const postResponse = await POST(
      new NextRequest("http://localhost/api/ops/referral-tokens/app_intro", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayFields: ["NAME"] }),
      }),
      context,
    );

    expect(getResponse.status).toBe(401);
    expect(postResponse.status).toBe(401);
  });

  it("rejects unauthenticated ops mutations", async () => {
    const response = await PATCH(
      new NextRequest("http://localhost/api/ops/referral-tokens/app_intro", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "DISABLE" }),
      }),
      { params: Promise.resolve({ applicationId: "app_intro" }) },
    );

    expect(response.status).toBe(401);
  });

  it("rejects display fields that omit the expert name", async () => {
    const cookie = await authCookieHeader();
    const response = await POST(
      createPostRequest({ displayFields: ["EMAIL"] }, cookie),
      { params: Promise.resolve({ applicationId: "app_intro" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "REFERRAL_TOKEN_INVALID_PAYLOAD",
    });
  });

  it("rejects display fields outside the fixed catalog", async () => {
    const cookie = await authCookieHeader();
    const response = await POST(
      createPostRequest({ displayFields: ["NAME", "UNKNOWN"] }, cookie),
      { params: Promise.resolve({ applicationId: "app_intro" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "REFERRAL_TOKEN_INVALID_PAYLOAD",
    });
  });

  it("generates a random referral token that expires after 90 days", async () => {
    const cookie = await authCookieHeader();
    const response = await POST(
      createPostRequest(
        { displayFields: ["NAME", "TITLE", "ORGANIZATION"] },
        cookie,
      ),
      { params: Promise.resolve({ applicationId: "app_intro" }) },
    );

    expect(response.status).toBe(201);
    const payload = (await response.json()) as {
      readonly token: {
        readonly applicationId: string;
        readonly expertId: string;
        readonly status: string;
        readonly displayFields: readonly string[];
        readonly createdAt: string;
        readonly expiredAt: string;
      };
      readonly plaintextToken: string;
      readonly referralLink: string;
    };
    expect(payload.plaintextToken).toMatch(/^[0-9a-f]{64}$/);
    expect(payload.referralLink).toBe(
      `https://example.test/referral?t=${payload.plaintextToken}`,
    );
    expect(payload.referralLink).not.toContain("intro@example.com");
    expect(payload.token).toMatchObject({
      applicationId: "app_intro",
      expertId: "expert_init",
      status: "ACTIVE",
      displayFields: ["NAME", "TITLE", "ORGANIZATION"],
    });
    expect(
      new Date(payload.token.expiredAt).getTime() -
        new Date(payload.token.createdAt).getTime(),
    ).toBe(90 * 24 * 60 * 60 * 1_000);
    expect(storedReferralTokens()).toHaveLength(1);
    expect(storedReferralTokens()[0]).toMatchObject({
      tokenHash: hashReferralToken(payload.plaintextToken),
      status: "ACTIVE",
    });
    expect(storedReferralTokens()[0]?.createdBy).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(storedReferralTokens()[0]).not.toHaveProperty("plaintextToken");
    expect(storedReferralTokens()[0]).not.toHaveProperty("referralLink");
  });

  it("returns only metadata when the token is loaded again", async () => {
    const cookie = await authCookieHeader();
    await POST(
      createPostRequest({ displayFields: ["NAME", "EMAIL"] }, cookie),
      { params: Promise.resolve({ applicationId: "app_intro" }) },
    );

    const response = await GET(
      new NextRequest("http://localhost/api/ops/referral-tokens/app_intro", {
        headers: { cookie },
      }),
      { params: Promise.resolve({ applicationId: "app_intro" }) },
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toMatchObject({
      token: {
        status: "ACTIVE",
        displayFields: ["NAME", "EMAIL"],
      },
    });
    expect(payload).not.toHaveProperty("plaintextToken");
    expect(payload).not.toHaveProperty("referralLink");
    expect(payload.token).not.toHaveProperty("tokenHash");
    expect(payload.token).not.toHaveProperty("createdBy");
  });

  it("returns null metadata before an expert has a referral token", async () => {
    const cookie = await authCookieHeader();
    const response = await GET(
      new NextRequest("http://localhost/api/ops/referral-tokens/app_intro", {
        headers: { cookie },
      }),
      { params: Promise.resolve({ applicationId: "app_intro" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ token: null });
  });

  it("enforces one active referral token per expert application", async () => {
    const cookie = await authCookieHeader();
    await POST(createPostRequest({ displayFields: ["NAME"] }, cookie), {
      params: Promise.resolve({ applicationId: "app_intro" }),
    });

    const response = await POST(
      createPostRequest({ displayFields: ["NAME", "PHONE"] }, cookie),
      { params: Promise.resolve({ applicationId: "app_intro" }) },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "REFERRAL_TOKEN_ACTIVE_EXISTS",
    });
    expect(
      storedReferralTokens().filter((token) => token.status === "ACTIVE"),
    ).toHaveLength(1);
  });

  it("enforces one active token across applications for the same expert", async () => {
    const cookie = await authCookieHeader();
    await POST(createPostRequest({ displayFields: ["NAME"] }, cookie), {
      params: Promise.resolve({ applicationId: "app_intro" }),
    });
    await seedSecondApplicationForExpert("app_intro_second");

    const response = await POST(
      createPostRequest(
        { displayFields: ["NAME"] },
        cookie,
        "app_intro_second",
      ),
      { params: Promise.resolve({ applicationId: "app_intro_second" }) },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "REFERRAL_TOKEN_ACTIVE_EXISTS",
    });
  });

  it("loads the expert token through another application", async () => {
    const cookie = await authCookieHeader();
    const created = await POST(
      createPostRequest({ displayFields: ["NAME", "TITLE"] }, cookie),
      { params: Promise.resolve({ applicationId: "app_intro" }) },
    );
    const createdPayload = await created.json();
    await seedSecondApplicationForExpert("app_intro_second");

    const response = await GET(
      new NextRequest(
        "http://localhost/api/ops/referral-tokens/app_intro_second",
        { headers: { cookie } },
      ),
      { params: Promise.resolve({ applicationId: "app_intro_second" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      token: {
        id: createdPayload.token.id,
        expertId: createdPayload.token.expertId,
        status: "ACTIVE",
      },
    });
  });

  it("returns 404 when the expert application does not exist", async () => {
    const cookie = await authCookieHeader();
    const response = await POST(
      createPostRequest({ displayFields: ["NAME"] }, cookie),
      { params: Promise.resolve({ applicationId: "missing-application" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      code: "REFERRAL_EXPERT_NOT_FOUND",
    });
  });
});
