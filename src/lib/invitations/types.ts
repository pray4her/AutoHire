import type { InviteHashAlgorithm } from "@/lib/auth/token";

export type InvitationGenerationItemSummary = {
  readonly sequence: number;
  readonly invitationId: string;
  readonly expertId: string;
  readonly plaintextToken: string;
  readonly tokenHash: string;
  readonly inviteLink: string;
  readonly hashAlgorithm: InviteHashAlgorithm;
  readonly createdAt: string;
};

export type InvitationGenerationBatchSummary = {
  readonly id: string;
  readonly idempotencyKey: string;
  readonly hashAlgorithm: InviteHashAlgorithm;
  readonly requestedCount: number;
  readonly createdCount: number;
  readonly expiredDays: number;
  readonly expiredHours: number;
  readonly expiredMinutes: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly items: readonly InvitationGenerationItemSummary[];
};
