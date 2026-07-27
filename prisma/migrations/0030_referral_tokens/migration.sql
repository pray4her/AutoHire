CREATE TYPE "ReferralTokenStatus" AS ENUM ('ACTIVE', 'DISABLED');

CREATE TABLE "ReferralToken" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "expertId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "displayFields" JSONB NOT NULL,
    "status" "ReferralTokenStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiredAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReferralTokenClickLog" (
    "id" TEXT NOT NULL,
    "referralTokenId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "accessResult" "AccessResult" NOT NULL,
    "ipRaw" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralTokenClickLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReferralToken_tokenHash_key" ON "ReferralToken"("tokenHash");
CREATE INDEX "ReferralToken_applicationId_createdAt_idx" ON "ReferralToken"("applicationId", "createdAt");
CREATE INDEX "ReferralToken_expertId_idx" ON "ReferralToken"("expertId");
CREATE INDEX "ReferralToken_status_expiredAt_idx" ON "ReferralToken"("status", "expiredAt");
CREATE UNIQUE INDEX "ReferralToken_one_active_per_expert" ON "ReferralToken"("expertId") WHERE "status" = 'ACTIVE';
CREATE INDEX "ReferralTokenClickLog_referralTokenId_createdAt_idx" ON "ReferralTokenClickLog"("referralTokenId", "createdAt");
CREATE INDEX "ReferralTokenClickLog_tokenHash_createdAt_idx" ON "ReferralTokenClickLog"("tokenHash", "createdAt");
CREATE INDEX "ReferralTokenClickLog_accessResult_createdAt_idx" ON "ReferralTokenClickLog"("accessResult", "createdAt");

ALTER TABLE "ReferralToken" ADD CONSTRAINT "ReferralToken_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReferralTokenClickLog" ADD CONSTRAINT "ReferralTokenClickLog_referralTokenId_fkey" FOREIGN KEY ("referralTokenId") REFERENCES "ReferralToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;
