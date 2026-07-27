import { NextRequest, NextResponse } from "next/server";

import {
  resolveApplyEntryAccessFromAccountSession,
  resolveApplyEntryAccessFromSessionCookie,
  resolveApplyEntryAccessFromToken,
} from "@/features/application/server/apply-entry-access";
import { getAccountSessionFromHeaders } from "@/lib/account-auth/request-session";
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

function setSessionCookie(
  response: NextResponse,
  request: NextRequest,
  sessionToken: string,
) {
  response.cookies.set({
    name: getSessionCookieName(),
    value: sessionToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && isClientHttps(request),
    path: "/",
    maxAge: getSessionMaxAgeSeconds(),
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
    setSessionCookie(response, request, result.sessionToken);

    return response;
  }

  if (request.nextUrl.searchParams.get("account") === "1") {
    return handleAccountBootstrap(request, redirectTo);
  }

  const result = await resolveApplyEntryAccessFromSessionCookie(
    request.cookies.get(getSessionCookieName())?.value,
  );

  if (result.kind === "rejected") {
    if (result.code === "SESSION_REQUIRED") {
      // Account track: fall back to the Better Auth session so signed-in
      // users restore their shadow application without an invite link.
      const identity = await getAccountSessionFromHeaders(request.headers);

      if (identity) {
        const accountResponse = await buildAccountSessionResponse(
          request,
          identity,
          null,
        );

        if (accountResponse) {
          return accountResponse;
        }
      }
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
    eventType: "session_restored",
    applicationId: result.snapshot.applicationId,
    pageName: "apply_entry",
    stepName: "invite_access",
    actionName: "page_view",
    eventStatus: "SUCCESS",
  });

  return NextResponse.json(result.snapshot);
}

async function handleAccountBootstrap(
  request: NextRequest,
  redirectTo: string | null,
) {
  const identity = await getAccountSessionFromHeaders(request.headers);

  if (!identity) {
    const loginUrl = new URL("/login", resolveClientFacingOrigin(request));

    if (redirectTo) {
      return NextResponse.redirect(loginUrl, { status: 307 });
    }

    return jsonError("No valid account session was found. Please log in.", 401, {
      code: "SESSION_REQUIRED",
    });
  }

  const response = await buildAccountSessionResponse(
    request,
    identity,
    redirectTo,
  );

  if (!response) {
    return jsonError("Unable to initialize the application session.", 500, {
      code: "SESSION_INIT_FAILED",
    });
  }

  return response;
}

async function buildAccountSessionResponse(
  request: NextRequest,
  identity: { userId: string; email: string },
  redirectTo: string | null,
) {
  const result = await resolveApplyEntryAccessFromAccountSession(identity);

  if (result.kind === "rejected" || !result.sessionToken) {
    return null;
  }

  await trackEventFromRequest(request, {
    eventType: "session_restored",
    applicationId: result.snapshot.applicationId,
    pageName: "apply_entry",
    stepName: "invite_access",
    actionName: "page_view",
    eventStatus: "SUCCESS",
  });

  const redirectTarget = resolveRedirectTarget(request, redirectTo);
  const response = redirectTarget
    ? NextResponse.redirect(redirectTarget)
    : NextResponse.json(result.snapshot);
  setSessionCookie(response, request, result.sessionToken);

  return response;
}
