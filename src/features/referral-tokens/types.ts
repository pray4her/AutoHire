import type { ReferralDisplayField } from "@/lib/referral-tokens/schemas";

export type ReferralExpertOption = {
  readonly applicationId: string;
  readonly expertId: string;
  readonly customerNo: string;
  readonly name: string | null;
  readonly email: string | null;
};

export type ReferralTokenMetadata = {
  readonly id: string;
  readonly applicationId: string;
  readonly expertId: string;
  readonly displayFields: readonly ReferralDisplayField[];
  readonly status: "ACTIVE" | "EXPIRED" | "DISABLED";
  readonly expiredAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly funnel?: {
    readonly clickCount: number;
    readonly registrationCount: number;
    readonly applicationCount: number;
  };
};

export type GeneratedReferralToken = {
  readonly token: ReferralTokenMetadata;
  readonly plaintextToken: string;
  readonly referralLink: string;
};
