import { getApplicationById } from "@/lib/data/store";
import { getEnv } from "@/lib/env";
import { getReferralTokenFunnel } from "@/lib/referral-tokens/attribution";
import {
  createReferralTokenRecord,
  disableActiveReferralToken,
  findReferralTokenForExpert,
  replaceReferralTokenRecord,
  renewActiveReferralToken,
} from "@/lib/referral-tokens/repository";
import type { ReferralDisplayField } from "@/lib/referral-tokens/schemas";
import { issueReferralTokenMaterial } from "@/lib/referral-tokens/token";
import {
  REFERRAL_TOKEN_DEFAULT_LIFETIME_DAYS,
  toReferralTokenView,
  type ReferralTokenOpsView,
  type ReferralTokenRecord,
} from "@/lib/referral-tokens/types";

export class ReferralTokenNotFoundError extends Error {
  constructor() {
    super("未找到该专家档案。");
    this.name = "ReferralTokenNotFoundError";
  }
}

export class ActiveReferralTokenExistsError extends Error {
  constructor() {
    super("该专家已有有效的推荐 token。");
    this.name = "ActiveReferralTokenExistsError";
  }
}

export class ReferralTokenUnavailableError extends Error {
  constructor() {
    super("该专家没有可操作的推荐 token。");
    this.name = "ReferralTokenUnavailableError";
  }
}

async function toOpsReferralTokenView(
  record: ReferralTokenRecord,
): Promise<ReferralTokenOpsView> {
  return {
    ...toReferralTokenView(record),
    funnel: await getReferralTokenFunnel(record.id),
  };
}

export async function getReferralToken(applicationId: string) {
  const application = await getApplicationById(applicationId);
  if (!application) {
    return null;
  }
  const token = await findReferralTokenForExpert(application.expertId);
  if (!token) {
    return null;
  }
  return toOpsReferralTokenView(token);
}

async function requireReferralApplication(applicationId: string) {
  const application = await getApplicationById(applicationId);
  if (!application) {
    throw new ReferralTokenNotFoundError();
  }
  return application;
}

async function presentGeneratedReferralToken(
  record: ReferralTokenRecord,
  plaintextToken: string,
) {
  return {
    token: await toOpsReferralTokenView(record),
    plaintextToken,
    referralLink: `${new URL(getEnv().APP_BASE_URL).origin}/referral?t=${encodeURIComponent(plaintextToken)}`,
  };
}

export async function generateReferralToken(input: {
  readonly applicationId: string;
  readonly displayFields: readonly ReferralDisplayField[];
  readonly createdBy: string;
}) {
  const application = await requireReferralApplication(input.applicationId);
  const issued = issueReferralTokenMaterial();

  const record = await createReferralTokenRecord({
    applicationId: application.id,
    expertId: application.expertId,
    tokenHash: issued.tokenHash,
    displayFields: input.displayFields,
    expiredAt: issued.expiredAt,
    createdBy: input.createdBy,
    createdAt: issued.createdAt,
  });
  if (!record) {
    throw new ActiveReferralTokenExistsError();
  }

  return presentGeneratedReferralToken(record, issued.plaintextToken);
}

export async function disableReferralToken(applicationId: string) {
  const application = await requireReferralApplication(applicationId);
  const record = await disableActiveReferralToken(application.expertId);
  if (!record) {
    throw new ReferralTokenUnavailableError();
  }
  return toOpsReferralTokenView(record);
}

export async function renewReferralToken(applicationId: string) {
  const application = await requireReferralApplication(applicationId);
  const record = await renewActiveReferralToken({
    expertId: application.expertId,
    lifetimeDays: REFERRAL_TOKEN_DEFAULT_LIFETIME_DAYS,
  });
  if (!record) {
    throw new ReferralTokenUnavailableError();
  }
  return toOpsReferralTokenView(record);
}

export async function regenerateReferralToken(input: {
  readonly applicationId: string;
  readonly displayFields: readonly ReferralDisplayField[];
  readonly createdBy: string;
}) {
  const application = await requireReferralApplication(input.applicationId);
  const issued = issueReferralTokenMaterial();
  const record = await replaceReferralTokenRecord({
    applicationId: application.id,
    expertId: application.expertId,
    tokenHash: issued.tokenHash,
    displayFields: input.displayFields,
    expiredAt: issued.expiredAt,
    createdBy: input.createdBy,
    createdAt: issued.createdAt,
  });

  return presentGeneratedReferralToken(record, issued.plaintextToken);
}
