import type { ReferralDisplayField } from "@/lib/referral-tokens/schemas";

export const REFERRAL_TOKEN_DEFAULT_LIFETIME_DAYS = 90;

export type ReferralTokenRecord = {
  readonly id: string;
  readonly applicationId: string;
  readonly expertId: string;
  readonly tokenHash: string;
  readonly displayFields: readonly ReferralDisplayField[];
  readonly status: "ACTIVE" | "DISABLED";
  readonly expiredAt: Date;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ReferralTokenView = Omit<
  ReferralTokenRecord,
  "tokenHash" | "createdBy" | "status" | "expiredAt" | "createdAt" | "updatedAt"
> & {
  readonly status: "ACTIVE" | "EXPIRED" | "DISABLED";
  readonly expiredAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type ReferralTokenFunnelView = {
  readonly clickCount: number;
  readonly registrationCount: number;
  readonly applicationCount: number;
};

export type ReferralTokenOpsView = ReferralTokenView & {
  readonly funnel: ReferralTokenFunnelView;
};

export function toReferralTokenView(
  record: ReferralTokenRecord,
): ReferralTokenView {
  return {
    id: record.id,
    applicationId: record.applicationId,
    expertId: record.expertId,
    displayFields: record.displayFields,
    status:
      record.status === "ACTIVE" && record.expiredAt.getTime() <= Date.now()
        ? "EXPIRED"
        : record.status,
    expiredAt: record.expiredAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
