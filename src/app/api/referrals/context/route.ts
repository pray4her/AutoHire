import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isClientHttps } from "@/lib/http";
import {
  isReferralPlaintextToken,
  referralContextCookieOptions,
  REFERRAL_CONTEXT_COOKIE_NAME,
} from "@/lib/referral-tokens/context-cookie";

/**
 * Captures same-session referral context into an httpOnly cookie, then
 * redirects into the account-track signup flow. Cookie writes must happen in
 * a Route Handler (not a Server Component render).
 */
export async function GET(request: NextRequest): Promise<Response> {
  const token = request.nextUrl.searchParams.get("t");
  const signupUrl = new URL("/signup", request.url);

  if (!isReferralPlaintextToken(token)) {
    return NextResponse.redirect(signupUrl);
  }

  const response = NextResponse.redirect(signupUrl);
  response.cookies.set({
    name: REFERRAL_CONTEXT_COOKIE_NAME,
    value: token,
    ...referralContextCookieOptions(
      process.env.NODE_ENV === "production" && isClientHttps(request),
    ),
  });
  return response;
}
