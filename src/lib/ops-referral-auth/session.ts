import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { getEnv } from "@/lib/env";

type OpsReferralCookiePayload = {
  username: string;
  passwordVersion: number;
  issuedAt: number;
};

function timingSafeStringEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function encode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", getEnv().INVITE_TOKEN_SECRET)
    .update(`ops-referral-cookie:${value}`)
    .digest("base64url");
}

function isCookiePayloadExpired(issuedAt: unknown) {
  if (typeof issuedAt !== "number" || !Number.isFinite(issuedAt)) {
    return true;
  }

  return (
    Date.now() - issuedAt >
    getEnv().OPS_REFERRAL_COOKIE_MAX_AGE_SECONDS * 1000
  );
}

export function getOpsReferralCookieName() {
  return getEnv().OPS_REFERRAL_COOKIE_NAME;
}

export function getOpsReferralCookieMaxAgeSeconds() {
  return getEnv().OPS_REFERRAL_COOKIE_MAX_AGE_SECONDS;
}

/** Comma-separated Referral Ops Account usernames from env (trimmed, de-duplicated). */
export function getOpsReferralUsernames(): string[] {
  const seen = new Set<string>();
  const usernames: string[] = [];
  for (const part of getEnv().OPS_REFERRAL_USERNAME.split(",")) {
    const username = part.trim();
    if (!username || seen.has(username)) continue;
    seen.add(username);
    usernames.push(username);
  }
  return usernames;
}

export function isAllowedOpsReferralUsername(username: string) {
  return getOpsReferralUsernames().includes(username);
}

export function createOpsReferralOperatorDigest(username: string) {
  return createHash("sha256")
    .update(`ops-referral:${username}`)
    .digest("base64url");
}

export function createOpsReferralCookie(input: {
  username: string;
  passwordVersion: number;
}) {
  const payload: OpsReferralCookiePayload = {
    username: input.username,
    passwordVersion: input.passwordVersion,
    issuedAt: Date.now(),
  };
  const encodedPayload = encode(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function parseCookiePayload(cookieValue: string | undefined | null) {
  if (!cookieValue) {
    return null;
  }

  const [encodedPayload, signature] = cookieValue.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);

  if (!timingSafeStringEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      decode(encodedPayload),
    ) as OpsReferralCookiePayload;

    if (
      typeof payload.username !== "string" ||
      !payload.username ||
      typeof payload.passwordVersion !== "number" ||
      !Number.isInteger(payload.passwordVersion) ||
      isCookiePayloadExpired(payload.issuedAt)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function peekOpsReferralSession(cookieValue: string | undefined | null) {
  return parseCookiePayload(cookieValue);
}
