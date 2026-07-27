-- AlterTable
ALTER TABLE "Application" ADD COLUMN "referralTokenId" TEXT;

-- CreateIndex
CREATE INDEX "Application_referralTokenId_idx" ON "Application"("referralTokenId");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_referralTokenId_fkey" FOREIGN KEY ("referralTokenId") REFERENCES "ReferralToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;
