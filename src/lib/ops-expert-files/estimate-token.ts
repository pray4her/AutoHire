import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { getEnv } from "@/lib/env";
import { OPS_EXPORT_ESTIMATE_TTL_SECONDS } from "@/lib/ops-expert-files/constants";

export type EstimateTokenPayload = {
  mode: "filter" | "ids";
  applicationIdsHash: string;
  exportableCount: number;
  excludedEmptyCount: number;
  estimatedBytes: number;
  exp: number;
};

function getEstimateSecret() {
  const env = getEnv();
  return (
    (env as { OPS_EXPORT_ESTIMATE_SECRET?: string }).OPS_EXPORT_ESTIMATE_SECRET ||
    env.INVITE_TOKEN_SECRET
  );
}

export function hashApplicationIds(applicationIds: string[]) {
  const normalized = [...applicationIds].sort().join("|");
  return createHash("sha256").update(normalized).digest("hex");
}

export function signEstimateToken(payload: Omit<EstimateTokenPayload, "exp">) {
  const full: EstimateTokenPayload = {
    ...payload,
    exp: Date.now() + OPS_EXPORT_ESTIMATE_TTL_SECONDS * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(full)).toString("base64url");
  const signature = createHmac("sha256", getEstimateSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyEstimateToken(token: string): EstimateTokenPayload {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    throw new EstimateTokenError("Invalid estimate token.");
  }

  const expected = createHmac("sha256", getEstimateSecret())
    .update(encoded)
    .digest("base64url");

  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new EstimateTokenError("Invalid estimate token signature.");
  }

  const payload = JSON.parse(
    Buffer.from(encoded, "base64url").toString("utf8"),
  ) as EstimateTokenPayload;

  if (!payload.exp || Date.now() > payload.exp) {
    throw new EstimateTokenError("Estimate token expired.");
  }

  return payload;
}

export class EstimateTokenError extends Error {
  readonly code = "ESTIMATE_TOKEN_INVALID";

  constructor(message: string) {
    super(message);
    this.name = "EstimateTokenError";
  }
}
