import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isClientHttps } from "@/lib/http";
import {
  getOpsReferralCookieMaxAgeSeconds,
  getOpsReferralCookieName,
} from "@/lib/ops-referral-auth/session";

export function setOpsReferralSessionCookie(
  response: NextResponse,
  request: NextRequest,
  cookieValue: string,
) {
  response.cookies.set({
    name: getOpsReferralCookieName(),
    value: cookieValue,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && isClientHttps(request),
    path: "/",
    maxAge: getOpsReferralCookieMaxAgeSeconds(),
  });
}

export function clearOpsReferralSessionCookie(
  response: NextResponse,
  request: NextRequest,
) {
  response.cookies.set({
    name: getOpsReferralCookieName(),
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && isClientHttps(request),
    path: "/",
    maxAge: 0,
  });
}
