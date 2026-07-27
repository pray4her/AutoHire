import { log } from "@/lib/logger";
import {
  findReferralTokenByHash,
  recordReferralClick,
  type ReferralClickAccessResult,
} from "@/lib/referral-tokens/public-repository";
import { publicReferralTokenSchema } from "@/lib/referral-tokens/schemas";
import { hashReferralToken } from "@/lib/referral-tokens/token";

export type PublicReferralResult =
  | { readonly status: "VALID" }
  | { readonly status: "UNAVAILABLE" };

export type ReferralRequestContext = {
  readonly ipRaw: string | null;
  readonly userAgent: string | null;
};

type RequestHeaders = { get(name: string): string | null };

export function referralRequestContextFromHeaders(headers: RequestHeaders): ReferralRequestContext {
  return {
    ipRaw:
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headers.get("x-real-ip")?.trim() ??
      null,
    userAgent: headers.get("user-agent"),
  };
}

export async function resolvePublicReferral(
  plaintextToken: string,
  context: ReferralRequestContext,
): Promise<PublicReferralResult> {
  const tokenHash = hashReferralToken(plaintextToken);
  const parsed = publicReferralTokenSchema.safeParse(plaintextToken);
  const token = parsed.success ? await findReferralTokenByHash(tokenHash) : null;
  let accessResult: ReferralClickAccessResult = "INVALID";
  if (token?.status === "ACTIVE" && token.expiredAt.getTime() > Date.now()) {
    accessResult = "VALID";
  } else if (token?.status === "DISABLED") {
    accessResult = "DISABLED";
  } else if (token) {
    accessResult = "EXPIRED";
  }
  try {
    await recordReferralClick({
      referralTokenId: token?.id ?? null,
      tokenHash,
      accessResult,
      ipRaw: context.ipRaw,
      userAgent: context.userAgent,
    });
  } catch (error) {
    log("error", "Failed to record referral click", {
      error: error instanceof Error ? error.message : String(error),
      tokenHash,
    });
  }
  return accessResult === "VALID" ? { status: "VALID" } : { status: "UNAVAILABLE" };
}
