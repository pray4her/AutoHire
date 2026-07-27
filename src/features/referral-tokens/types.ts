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
};

export type GeneratedReferralToken = {
  readonly token: ReferralTokenMetadata;
  readonly plaintextToken: string;
  readonly referralLink: string;
};
