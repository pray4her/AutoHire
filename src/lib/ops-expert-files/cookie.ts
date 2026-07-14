import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isClientHttps } from "@/lib/http";
import {
  getOpsExpertFilesCookieMaxAgeSeconds,
  getOpsExpertFilesCookieName,
} from "@/lib/ops-expert-files/session";

export function setOpsExpertFilesSessionCookie(
  response: NextResponse,
  request: NextRequest,
  cookieValue: string,
) {
  response.cookies.set({
    name: getOpsExpertFilesCookieName(),
    value: cookieValue,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && isClientHttps(request),
    path: "/",
    maxAge: getOpsExpertFilesCookieMaxAgeSeconds(),
  });
}

export function clearOpsExpertFilesSessionCookie(
  response: NextResponse,
  request: NextRequest,
) {
  response.cookies.set({
    name: getOpsExpertFilesCookieName(),
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && isClientHttps(request),
    path: "/",
    maxAge: 0,
  });
}
