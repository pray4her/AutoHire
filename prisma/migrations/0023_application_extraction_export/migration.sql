-- CreateEnum
CREATE TYPE "ApplicationExtractionExportStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "ApplicationExtractionExportTrigger" AS ENUM ('CONFIRM', 'RESULT', 'FEEDBACK');

-- CreateTable
CREATE TABLE "ApplicationExtractionExport" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "status" "ApplicationExtractionExportStatus" NOT NULL DEFAULT 'PENDING',
    "contentSha256" TEXT,
    "fileSize" INTEGER,
    "dirty" BOOLEAN NOT NULL DEFAULT false,
    "leaseExpiresAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "exportedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "lastTrigger" "ApplicationExtractionExportTrigger",
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationExtractionExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationExtractionExport_applicationId_key" ON "ApplicationExtractionExport"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationExtractionExport_status_leaseExpiresAt_idx" ON "ApplicationExtractionExport"("status", "leaseExpiresAt");

-- CreateIndex
CREATE INDEX "ApplicationExtractionExport_status_dirty_idx" ON "ApplicationExtractionExport"("status", "dirty");

-- AddForeignKey
ALTER TABLE "ApplicationExtractionExport" ADD CONSTRAINT "ApplicationExtractionExport_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
