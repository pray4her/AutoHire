import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAccountSessionFromHeaders } from "@/lib/account-auth/request-session";
import { isClientHttps } from "@/lib/http";
import {
  isReferralPlaintextToken,
  referralContextCookieOptions,
  REFERRAL_CONTEXT_COOKIE_NAME,
} from "@/lib/referral-tokens/context-cookie";

const RESUME_PATH = "/apply/resume";

/**
 * Captures same-session referral context into an httpOnly cookie, then
 * redirects into signup/login (or straight to resume when already logged in).
 * Logged-in users do not receive the cookie — attribution is not backfilled.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const token = request.nextUrl.searchParams.get("t");
  const toLogin = request.nextUrl.searchParams.get("to") === "login";
  const accountSession = await getAccountSessionFromHeaders(request.headers);

  if (accountSession) {
    return NextResponse.redirect(new URL(RESUME_PATH, request.url));
  }

  const authPath = toLogin ? "/login" : "/signup";
  const authUrl = new URL(authPath, request.url);
  authUrl.searchParams.set("next", RESUME_PATH);

  if (!isReferralPlaintextToken(token)) {
    return NextResponse.redirect(authUrl);
  }

  const response = NextResponse.redirect(authUrl);
  response.cookies.set({
    name: REFERRAL_CONTEXT_COOKIE_NAME,
    value: token,
    ...referralContextCookieOptions(
      process.env.NODE_ENV === "production" && isClientHttps(request),
    ),
  });
  return response;
}
