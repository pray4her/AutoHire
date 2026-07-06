import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getEnv } from "@/lib/env";

/**
 * Whether the client-facing request is served over HTTPS.
 * Honors `x-forwarded-proto` so TLS-terminated deployments still set `Secure` cookies.
 */
export function isClientHttps(request: NextRequest) {
  const forwarded = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();

  if (forwarded === "https") {
    return true;
  }

  if (forwarded === "http") {
    return false;
  }

  return request.nextUrl.protocol === "https:";
}

function getFirstForwardedHeaderValue(
  request: NextRequest,
  headerName: "x-forwarded-host" | "x-forwarded-proto",
) {
  return request.headers
    .get(headerName)
    ?.split(",")[0]
    ?.trim();
}

function isLocalHostName(hostname: string) {
  const normalized = hostname.trim().toLowerCase();

  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1"
  );
}

export function resolveClientFacingOrigin(request: NextRequest) {
  const forwardedHost = getFirstForwardedHeaderValue(request, "x-forwarded-host");
  const forwardedProto = getFirstForwardedHeaderValue(request, "x-forwarded-proto");

  if (forwardedHost) {
    const protocol = forwardedProto || (isClientHttps(request) ? "https" : "http");
    return `${protocol}://${forwardedHost}`;
  }

  const requestHost = request.headers.get("host")?.trim();

  if (requestHost) {
    const requestHostname = requestHost.split(":")[0]?.trim();

    if (requestHostname && !isLocalHostName(requestHostname)) {
      const protocol = isClientHttps(request) ? "https" : "http";
      return `${protocol}://${requestHost}`;
    }
  }

  return new URL(getEnv().APP_BASE_URL).origin;
}

export function jsonError(
  message: string,
  status = 400,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json(
    {
      error: message,
      ...extra,
    },
    { status },
  );
}

export async function parseJsonBody<T>(request: Request) {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
