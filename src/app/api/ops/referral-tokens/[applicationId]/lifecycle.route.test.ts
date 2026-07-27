import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import {
  PATCH,
  POST,
} from "@/app/api/ops/referral-tokens/[applicationId]/route";
import {
  authCookieHeader,
  createPostRequest,
  setupReferralTokenRouteTests,
  storedReferralTokens,
} from "@/app/api/ops/referral-tokens/[applicationId]/referral-token-route-fixture";

describe("ops referral token lifecycle route", () => {
  setupReferralTokenRouteTests();

  it("rejects unsupported token actions", async () => {
    const cookie = await authCookieHeader();
    const response = await PATCH(
      new NextRequest("http://localhost/api/ops/referral-tokens/app_intro", {
        method: "PATCH",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ action: "ROTATE" }),
      }),
      { params: Promise.resolve({ applicationId: "app_intro" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "REFERRAL_TOKEN_INVALID_ACTION",
    });
  });

  it("rejects renewal when no active token exists", async () => {
    const cookie = await authCookieHeader();
    const response = await PATCH(
      new NextRequest("http://localhost/api/ops/referral-tokens/app_intro", {
        method: "PATCH",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ action: "RENEW" }),
      }),
      { params: Promise.resolve({ applicationId: "app_intro" }) },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "REFERRAL_TOKEN_UNAVAILABLE",
    });
  });

  it("returns 404 when regenerating for a missing expert application", async () => {
    const cookie = await authCookieHeader();
    const response = await PATCH(
      new NextRequest(
        "http://localhost/api/ops/referral-tokens/missing-application",
        {
          method: "PATCH",
          headers: { cookie, "content-type": "application/json" },
          body: JSON.stringify({
            action: "REGENERATE",
            displayFields: ["NAME"],
          }),
        },
      ),
      { params: Promise.resolve({ applicationId: "missing-application" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      code: "REFERRAL_EXPERT_NOT_FOUND",
    });
  });

  it("disables the active referral token", async () => {
    const cookie = await authCookieHeader();
    await POST(createPostRequest({ displayFields: ["NAME"] }, cookie), {
      params: Promise.resolve({ applicationId: "app_intro" }),
    });

    const response = await PATCH(
      new NextRequest("http://localhost/api/ops/referral-tokens/app_intro", {
        method: "PATCH",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ action: "DISABLE" }),
      }),
      { params: Promise.resolve({ applicationId: "app_intro" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      token: { status: "DISABLED" },
    });
  });

  it("renews an active referral token for another 90 days", async () => {
    const cookie = await authCookieHeader();
    const generated = await POST(
      createPostRequest({ displayFields: ["NAME"] }, cookie),
      { params: Promise.resolve({ applicationId: "app_intro" }) },
    );
    const generatedPayload = (await generated.json()) as {
      readonly token: { readonly expiredAt: string };
    };

    const response = await PATCH(
      new NextRequest("http://localhost/api/ops/referral-tokens/app_intro", {
        method: "PATCH",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ action: "RENEW" }),
      }),
      { params: Promise.resolve({ applicationId: "app_intro" }) },
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      readonly token: { readonly status: string; readonly expiredAt: string };
    };
    expect(payload.token.status).toBe("ACTIVE");
    expect(
      new Date(payload.token.expiredAt).getTime() -
        new Date(generatedPayload.token.expiredAt).getTime(),
    ).toBe(90 * 24 * 60 * 60 * 1_000);
  });

  it("regenerates the token and immediately disables the old token", async () => {
    const cookie = await authCookieHeader();
    const generated = await POST(
      createPostRequest({ displayFields: ["NAME"] }, cookie),
      { params: Promise.resolve({ applicationId: "app_intro" }) },
    );
    const first = (await generated.json()) as {
      readonly token: { readonly id: string };
      readonly plaintextToken: string;
    };

    const response = await PATCH(
      new NextRequest("http://localhost/api/ops/referral-tokens/app_intro", {
        method: "PATCH",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          action: "REGENERATE",
          displayFields: ["NAME", "PHONE"],
        }),
      }),
      { params: Promise.resolve({ applicationId: "app_intro" }) },
    );

    expect(response.status).toBe(200);
    const second = (await response.json()) as {
      readonly token: {
        readonly id: string;
        readonly status: string;
        readonly displayFields: readonly string[];
      };
      readonly plaintextToken: string;
      readonly referralLink: string;
    };
    expect(second.token).toMatchObject({
      status: "ACTIVE",
      displayFields: ["NAME", "PHONE"],
    });
    expect(second.token.id).not.toBe(first.token.id);
    expect(second.plaintextToken).toMatch(/^[0-9a-f]{64}$/);
    expect(second.plaintextToken).not.toBe(first.plaintextToken);
    expect(second.referralLink).toContain(second.plaintextToken);
    expect(storedReferralTokens()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: first.token.id, status: "DISABLED" }),
        expect.objectContaining({ id: second.token.id, status: "ACTIVE" }),
      ]),
    );
    expect(
      storedReferralTokens().filter((token) => token.status === "ACTIVE"),
    ).toHaveLength(1);
  });
});
