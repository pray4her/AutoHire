-- The first referral-token implementation was bound to an AutoHire
-- application/expert. Referral issuers now live in the external referrer
-- directory, so its data cannot be safely migrated.
DELETE FROM "ReferralTokenClickLog";
UPDATE "Application" SET "referralTokenId" = NULL;
DELETE FROM "ReferralToken";

ALTER TABLE "ReferralToken"
  DROP CONSTRAINT IF EXISTS "ReferralToken_applicationId_fkey";
DROP INDEX IF EXISTS "ReferralToken_applicationId_createdAt_idx";
DROP INDEX IF EXISTS "ReferralToken_expertId_idx";

ALTER TABLE "ReferralToken"
  DROP COLUMN IF EXISTS "applicationId",
  DROP COLUMN IF EXISTS "expertId",
  DROP COLUMN IF EXISTS "displayFields",
  ADD COLUMN "referrerEmail" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "referrerDisplayName" TEXT,
  ADD COLUMN "plaintextToken" TEXT NOT NULL DEFAULT '';

ALTER TABLE "ReferralToken"
  ALTER COLUMN "referrerEmail" DROP DEFAULT,
  ALTER COLUMN "plaintextToken" DROP DEFAULT;

CREATE INDEX "ReferralToken_referrerEmail_createdAt_idx"
  ON "ReferralToken"("referrerEmail", "createdAt");
CREATE UNIQUE INDEX "ReferralToken_one_active_per_referrer_email"
  ON "ReferralToken"("referrerEmail")
  WHERE "status" = 'ACTIVE';
