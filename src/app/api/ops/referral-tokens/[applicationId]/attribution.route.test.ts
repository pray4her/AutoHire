import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { GET, POST } from "@/app/api/ops/referral-tokens/[applicationId]/route";
import {
  authCookieHeader,
  createPostRequest,
  setupReferralTokenRouteTests,
} from "@/app/api/ops/referral-tokens/[applicationId]/referral-token-route-fixture";
import { ensureAccountApplication } from "@/lib/account-auth/shadow-invitation";
import { recordReferralClick } from "@/lib/referral-tokens/public-repository";
import { hashReferralToken } from "@/lib/referral-tokens/token";
import { listExpertFiles } from "@/lib/ops-expert-files/query";

describe("ops referral attribution views", () => {
  setupReferralTokenRouteTests();

  it("returns click/registration/application funnel on GET and shows referrer in expert files", async () => {
    const cookie = await authCookieHeader();
    const createResponse = await POST(
      createPostRequest({ displayFields: ["NAME"] }, cookie),
      { params: Promise.resolve({ applicationId: "app_intro" }) },
    );
    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as {
      readonly plaintextToken: string;
      readonly token: { readonly id: string };
    };

    await recordReferralClick({
      referralTokenId: created.token.id,
      tokenHash: hashReferralToken(created.plaintextToken),
      accessResult: "VALID",
      ipRaw: "127.0.0.1",
      userAgent: "vitest",
    });
    await recordReferralClick({
      referralTokenId: created.token.id,
      tokenHash: hashReferralToken(created.plaintextToken),
      accessResult: "VALID",
      ipRaw: "127.0.0.1",
      userAgent: "vitest",
    });

    const { application } = await ensureAccountApplication({
      userId: "friend_1",
      email: "friend1@example.com",
      referralPlaintextToken: created.plaintextToken,
    });
    expect(application.referralTokenId).toBe(created.token.id);

    // Make the attributed application listable in expert files.
    const store = (
      globalThis as typeof globalThis & {
        __autohireStore: {
          applications: Array<{
            id: string;
            customerNo: string | null;
            resumeUploadedAt: Date | null;
          }>;
        };
      }
    ).__autohireStore;
    const row = store.applications.find((item) => item.id === application.id);
    expect(row).toBeDefined();
    row!.customerNo = "CUST-FRIEND-1";
    row!.resumeUploadedAt = new Date();

    // Referrer sample has no passport name; falls back to invitation email.
    const intro = store.applications.find((item) => item.id === "app_intro");
    expect(intro).toBeDefined();
    intro!.customerNo = "CUST-OPS-1";
    intro!.resumeUploadedAt = new Date();

    const getResponse = await GET(
      new NextRequest("http://localhost/api/ops/referral-tokens/app_intro", {
        headers: { cookie },
      }),
      { params: Promise.resolve({ applicationId: "app_intro" }) },
    );
    expect(getResponse.status).toBe(200);
    await expect(getResponse.json()).resolves.toMatchObject({
      token: {
        id: created.token.id,
        funnel: {
          clickCount: 2,
          registrationCount: 1,
          applicationCount: 1,
        },
      },
    });

    const listed = await listExpertFiles({
      q: "",
      status: "all",
      source: "all",
      startDate: null,
      endDate: null,
      page: 1,
      pageSize: 50,
    });
    const friendItem = listed.items.find(
      (item) => item.applicationId === application.id,
    );
    expect(friendItem?.referredByExpertName).toBe("init@example.com");
    expect(friendItem?.invitationSource).toBe("ACCOUNT");
  });

  it("keeps funnel zeros when a token has no clicks or attributions", async () => {
    const cookie = await authCookieHeader();
    await POST(createPostRequest({ displayFields: ["NAME"] }, cookie), {
      params: Promise.resolve({ applicationId: "app_intro" }),
    });

    const getResponse = await GET(
      new NextRequest("http://localhost/api/ops/referral-tokens/app_intro", {
        headers: { cookie },
      }),
      { params: Promise.resolve({ applicationId: "app_intro" }) },
    );
    expect(getResponse.status).toBe(200);
    await expect(getResponse.json()).resolves.toMatchObject({
      token: {
        funnel: {
          clickCount: 0,
          registrationCount: 0,
          applicationCount: 0,
        },
      },
    });
  });
});
