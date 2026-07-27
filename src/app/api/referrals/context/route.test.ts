import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "@/app/api/referrals/context/route";
import {
  REFERRAL_CONTEXT_COOKIE_NAME,
  REFERRAL_CONTEXT_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/referral-tokens/context-cookie";
import { issueReferralTokenMaterial } from "@/lib/referral-tokens/token";

describe("GET /api/referrals/context", () => {
  it("sets the same-session referral cookie and redirects to signup", async () => {
    const { plaintextToken } = issueReferralTokenMaterial();
    const response = await GET(
      new NextRequest(
        `http://localhost/api/referrals/context?t=${plaintextToken}`,
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/signup");
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${REFERRAL_CONTEXT_COOKIE_NAME}=${plaintextToken}`);
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie).toContain(`Max-Age=${REFERRAL_CONTEXT_COOKIE_MAX_AGE_SECONDS}`);
  });

  it("redirects to signup without a cookie when the token is malformed", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/referrals/context?t=not-a-token"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/signup");
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
