export const REFERRAL_CONTEXT_COOKIE_NAME = "ah_referral_ctx";

/** Same-session attribution window — not a long-lived last-click cookie. */
export const REFERRAL_CONTEXT_COOKIE_MAX_AGE_SECONDS = 60 * 60;

export function isReferralPlaintextToken(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/i.test(value);
}

export function readReferralPlaintextFromCookieHeader(
  cookieHeader: string | null | undefined,
): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    const name = trimmed.slice(0, separator);
    if (name !== REFERRAL_CONTEXT_COOKIE_NAME) {
      continue;
    }
    const value = decodeURIComponent(trimmed.slice(separator + 1));
    return isReferralPlaintextToken(value) ? value : null;
  }

  return null;
}

export function referralContextCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: REFERRAL_CONTEXT_COOKIE_MAX_AGE_SECONDS,
  };
}
