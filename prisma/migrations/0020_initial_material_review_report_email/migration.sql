-- CreateEnum
CREATE TYPE "InitialMaterialReviewReportEmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "InitialMaterialReviewReportEmail" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "reviewRunId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "reportPayload" JSONB NOT NULL,
    "status" "InitialMaterialReviewReportEmailStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "providerMessageId" TEXT,
    "sentAt" TIMESTAMP(3),
    "inviteTokenAvailable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InitialMaterialReviewReportEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InitialMaterialReviewReportEmail_applicationId_key" ON "InitialMaterialReviewReportEmail"("applicationId");

-- CreateIndex
CREATE INDEX "InitialMaterialReviewReportEmail_status_nextRetryAt_idx" ON "InitialMaterialReviewReportEmail"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "InitialMaterialReviewReportEmail_reviewRunId_idx" ON "InitialMaterialReviewReportEmail"("reviewRunId");

-- AddForeignKey
ALTER TABLE "InitialMaterialReviewReportEmail" ADD CONSTRAINT "InitialMaterialReviewReportEmail_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
