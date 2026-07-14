import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { getEnv } from "@/lib/env";

type OpsExpertFilesCookiePayload = {
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
    .update(value)
    .digest("base64url");
}

function isCookiePayloadExpired(issuedAt: unknown) {
  if (typeof issuedAt !== "number" || !Number.isFinite(issuedAt)) {
    return true;
  }

  return (
    Date.now() - issuedAt >
    getEnv().OPS_EXPERT_FILES_COOKIE_MAX_AGE_SECONDS * 1000
  );
}

export function getOpsExpertFilesCookieName() {
  return getEnv().OPS_EXPERT_FILES_COOKIE_NAME;
}

export function getOpsExpertFilesCookieMaxAgeSeconds() {
  return getEnv().OPS_EXPERT_FILES_COOKIE_MAX_AGE_SECONDS;
}

export function getOpsExpertFilesUsername() {
  return getEnv().OPS_EXPERT_FILES_USERNAME;
}

export function createOpsExpertFilesOperatorDigest(username: string) {
  return createHash("sha256")
    .update(`ops-expert-files:${username}`)
    .digest("base64url");
}

export function createOpsExpertFilesCookie(input: {
  username: string;
  passwordVersion: number;
}) {
  const payload: OpsExpertFilesCookiePayload = {
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
    ) as OpsExpertFilesCookiePayload;

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

export function peekOpsExpertFilesSession(
  cookieValue: string | undefined | null,
) {
  return parseCookiePayload(cookieValue);
}

export function verifyOpsExpertFilesCookieShape(
  cookieValue: string | undefined | null,
) {
  return parseCookiePayload(cookieValue) !== null;
}
