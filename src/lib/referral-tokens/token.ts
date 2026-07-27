import { createHash, randomBytes } from "node:crypto";

import { REFERRAL_TOKEN_DEFAULT_LIFETIME_DAYS } from "@/lib/referral-tokens/types";

export function hashReferralToken(plaintextToken: string): string {
  return createHash("sha256").update(plaintextToken, "utf8").digest("hex");
}

export function issueReferralTokenMaterial(): {
  readonly plaintextToken: string;
  readonly tokenHash: string;
  readonly createdAt: Date;
  readonly expiredAt: Date;
} {
  const plaintextToken = randomBytes(32).toString("hex");
  const createdAt = new Date();
  const expiredAt = new Date(createdAt);
  expiredAt.setUTCDate(
    expiredAt.getUTCDate() + REFERRAL_TOKEN_DEFAULT_LIFETIME_DAYS,
  );

  return {
    plaintextToken,
    tokenHash: hashReferralToken(plaintextToken),
    createdAt,
    expiredAt,
  };
}
