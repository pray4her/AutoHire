export const REFERRAL_TOKEN_DEFAULT_LIFETIME_DAYS = 90;

export type ReferralTokenRecord = {
  readonly id: string;
  readonly referrerEmail: string;
  readonly referrerDisplayName: string | null;
  readonly tokenHash: string;
  readonly plaintextToken: string;
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
    referrerEmail: record.referrerEmail,
    referrerDisplayName: record.referrerDisplayName,
    plaintextToken: record.plaintextToken,
    status:
      record.status === "ACTIVE" && record.expiredAt.getTime() <= Date.now()
        ? "EXPIRED"
        : record.status,
    expiredAt: record.expiredAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
