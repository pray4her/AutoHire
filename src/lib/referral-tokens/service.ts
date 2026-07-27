import { getEnv } from "@/lib/env";
import { getReferralTokenFunnel } from "@/lib/referral-tokens/attribution";
import {
  createReferralTokenRecord,
  disableReferralTokenById,
  findActiveReferralTokenByEmail,
  findReferralTokenById,
  listReferralTokens,
  renewReferralTokenById,
  replaceReferralTokenRecord,
} from "@/lib/referral-tokens/repository";
import { issueReferralTokenMaterial } from "@/lib/referral-tokens/token";
import {
  REFERRAL_TOKEN_DEFAULT_LIFETIME_DAYS,
  toReferralTokenView,
  type ReferralTokenOpsView,
  type ReferralTokenRecord,
} from "@/lib/referral-tokens/types";

export class ReferralTokenUnavailableError extends Error {
  constructor() {
    super("该推荐链接不可操作。");
    this.name = "ReferralTokenUnavailableError";
  }
}

function referralLink(plaintextToken: string) {
  return `${new URL(getEnv().APP_BASE_URL).origin}/referral?t=${encodeURIComponent(plaintextToken)}`;
}

async function toOpsView(record: ReferralTokenRecord): Promise<ReferralTokenOpsView> {
  return { ...toReferralTokenView(record), funnel: await getReferralTokenFunnel(record.id) };
}

async function generated(record: ReferralTokenRecord) {
  return {
    token: await toOpsView(record),
    plaintextToken: record.plaintextToken,
    referralLink: referralLink(record.plaintextToken),
  };
}

export async function batchGenerateReferralTokens(input: {
  entries: readonly { email: string; displayName?: string }[];
  createdBy: string;
}) {
  const results = [];
  for (const entry of input.entries) {
    const issued = issueReferralTokenMaterial();
    const record = await createReferralTokenRecord({
      referrerEmail: entry.email,
      referrerDisplayName: entry.displayName ?? null,
      tokenHash: issued.tokenHash,
      plaintextToken: issued.plaintextToken,
      expiredAt: issued.expiredAt,
      createdBy: input.createdBy,
      createdAt: issued.createdAt,
    });
    if (record) {
      results.push({ skipped: false as const, ...(await generated(record)) });
      continue;
    }
    const existing = await findActiveReferralTokenByEmail(entry.email);
    if (existing) {
      results.push({ skipped: true as const, ...(await generated(existing)) });
    }
  }
  return { results };
}

export async function listReferralTokensWithFunnels() {
  return Promise.all((await listReferralTokens()).map(toOpsView));
}

export async function disableReferralToken(tokenId: string) {
  const record = await disableReferralTokenById(tokenId);
  if (!record) throw new ReferralTokenUnavailableError();
  return toOpsView(record);
}

export async function renewReferralToken(tokenId: string) {
  const record = await renewReferralTokenById({
    id: tokenId,
    lifetimeDays: REFERRAL_TOKEN_DEFAULT_LIFETIME_DAYS,
  });
  if (!record) throw new ReferralTokenUnavailableError();
  return toOpsView(record);
}

export async function regenerateReferralToken(input: {
  tokenId: string;
  createdBy: string;
}) {
  const existing = await findReferralTokenById(input.tokenId);
  if (!existing) throw new ReferralTokenUnavailableError();
  const issued = issueReferralTokenMaterial();
  const record = await replaceReferralTokenRecord({
    referrerEmail: existing.referrerEmail,
    referrerDisplayName: existing.referrerDisplayName,
    tokenHash: issued.tokenHash,
    plaintextToken: issued.plaintextToken,
    expiredAt: issued.expiredAt,
    createdBy: input.createdBy,
    createdAt: issued.createdAt,
  });
  return generated(record);
}
