-- CreateEnum
CREATE TYPE "InvitationSource" AS ENUM ('OPS', 'ACCOUNT');

-- AlterTable
ALTER TABLE "ExpertInvitation" ADD COLUMN "source" "InvitationSource" NOT NULL DEFAULT 'OPS';

-- CreateIndex
CREATE INDEX "ExpertInvitation_source_idx" ON "ExpertInvitation"("source");

-- One shadow invitation per account email (account track); link-track
-- invitations keep email nullable and non-unique.
CREATE UNIQUE INDEX "ExpertInvitation_shadow_email_key" ON "ExpertInvitation"("email") WHERE "source" = 'ACCOUNT';
