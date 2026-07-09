import { NextRequest, NextResponse } from "next/server";

import {
  resolveApplyEntryAccessFromSessionCookie,
  resolveApplyEntryAccessFromToken,
} from "@/features/application/server/apply-entry-access";
import {
  getSessionCookieName,
  getSessionMaxAgeSeconds,
} from "@/lib/auth/session";
import {
  isClientHttps,
  jsonError,
  resolveClientFacingOrigin,
} from "@/lib/http";
import { trackEventFromRequest } from "@/lib/tracking/service";

function resolveRedirectTarget(
  request: NextRequest,
  redirectTo: string | null,
) {
  if (!redirectTo || !redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return null;
  }

  return new URL(redirectTo, resolveClientFacingOrigin(request));
}

function clearSessionCookie(response: NextResponse, request: NextRequest) {
  response.cookies.set({
    name: getSessionCookieName(),
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && isClientHttps(request),
    path: "/",
    maxAge: 0,
  });
}

function buildApplyErrorRedirect(
  request: NextRequest,
  code: string,
) {
  const location = new URL("/apply", resolveClientFacingOrigin(request));
  location.searchParams.set("accessError", code);
  const response = NextResponse.redirect(location, { status: 307 });

  if (code === "EXPIRED_TOKEN") {
    clearSessionCookie(response, request);
  }

  return response;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const redirectTo = request.nextUrl.searchParams.get("redirectTo");

  if (token) {
    const result = await resolveApplyEntryAccessFromToken(token);

    if (result.kind === "rejected") {
      await trackEventFromRequest(request, {
        eventType: "invite_link_invalid",
        token,
        pageName: "apply_entry",
        stepName: "invite_access",
        actionName: "page_view",
        eventStatus: "FAIL",
        landingPath: "/apply",
      });

      if (redirectTo) {
        return buildApplyErrorRedirect(request, result.code);
      }

      const response = jsonError(result.message, result.status, {
        code: result.code,
      });

      if (result.code === "EXPIRED_TOKEN") {
        clearSessionCookie(response, request);
      }

      return response;
    }

    await trackEventFromRequest(request, {
      eventType: "invite_link_opened",
      token,
      applicationId: result.snapshot.applicationId,
      pageName: "apply_entry",
      stepName: "invite_access",
      actionName: "page_view",
      eventStatus: "SUCCESS",
      landingPath: "/apply",
    });

    if (!result.sessionToken) {
      return jsonError("Unable to initialize the application session.", 500, {
        code: "SESSION_INIT_FAILED",
      });
    }

    const redirectTarget = resolveRedirectTarget(request, redirectTo);
    const response = redirectTarget
      ? NextResponse.redirect(redirectTarget)
      : NextResponse.json(result.snapshot);
    response.cookies.set({
      name: getSessionCookieName(),
      value: result.sessionToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production" && isClientHttps(request),
      path: "/",
      maxAge: getSessionMaxAgeSeconds(),
    });

    return response;
  }

  const result = await resolveApplyEntryAccessFromSessionCookie(
    request.cookies.get(getSessionCookieName())?.value,
  );

  if (result.kind === "rejected") {
    const response = jsonError(result.message, result.status, {
      code: result.code,
    });

    if (result.code === "EXPIRED_TOKEN") {
      clearSessionCookie(response, request);
    }

    return response;
  }

  await trackEventFromRequest(request, {
    eventType: "session_restored",
    applicationId: result.snapshot.applicationId,
    pageName: "apply_entry",
    stepName: "invite_access",
    actionName: "page_view",
    eventStatus: "SUCCESS",
  });

  return NextResponse.json(result.snapshot);
}
