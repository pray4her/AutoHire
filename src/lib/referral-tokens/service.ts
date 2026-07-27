import { getEnv } from "@/lib/env";
import {
  getReferralTokenFunnel,
  listReferralDownstream,
} from "@/lib/referral-tokens/attribution";
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

async function toOpsView(
  record: ReferralTokenRecord,
): Promise<ReferralTokenOpsView> {
  return {
    ...toReferralTokenView(record),
    funnel: await getReferralTokenFunnel(record.id),
  };
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

export async function listReferralTokensWithFunnels(createdBy: string) {
  return Promise.all((await listReferralTokens(createdBy)).map(toOpsView));
}

/** Tokens are scoped to the ops account that created them: anything owned by
 * another account is treated as unavailable (same 404 semantics as missing). */
type OwnedReferralTokenRef = {
  tokenId: string;
  createdBy: string;
};

async function findOwnedReferralToken(
  input: OwnedReferralTokenRef,
): Promise<ReferralTokenRecord> {
  const record = await findReferralTokenById(input.tokenId);
  if (!record || record.createdBy !== input.createdBy) {
    throw new ReferralTokenUnavailableError();
  }
  return record;
}

export async function disableReferralToken(input: OwnedReferralTokenRef) {
  await findOwnedReferralToken(input);
  const record = await disableReferralTokenById(input.tokenId);
  if (!record) throw new ReferralTokenUnavailableError();
  return toOpsView(record);
}

export async function renewReferralToken(input: OwnedReferralTokenRef) {
  await findOwnedReferralToken(input);
  const record = await renewReferralTokenById({
    id: input.tokenId,
    lifetimeDays: REFERRAL_TOKEN_DEFAULT_LIFETIME_DAYS,
  });
  if (!record) throw new ReferralTokenUnavailableError();
  return toOpsView(record);
}

export async function regenerateReferralToken(input: OwnedReferralTokenRef) {
  const existing = await findOwnedReferralToken(input);
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

export async function listReferralDownstreamForOwner(
  input: OwnedReferralTokenRef,
) {
  await findOwnedReferralToken(input);
  return listReferralDownstream(input.tokenId);
}
