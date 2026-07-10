-- CreateEnum
CREATE TYPE "OpsExportJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'SUCCEEDED_WITH_GAPS', 'FAILED');

-- CreateEnum
CREATE TYPE "OpsExportMode" AS ENUM ('FILTER', 'IDS');

-- AlterTable
ALTER TABLE "Application" ADD COLUMN "customerNo" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Application_customerNo_key" ON "Application"("customerNo");

-- CreateIndex
CREATE INDEX "Application_customerNo_idx" ON "Application"("customerNo");

-- CreateTable
CREATE TABLE "CustomerNoDailyCounter" (
    "dateKey" TEXT NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerNoDailyCounter_pkey" PRIMARY KEY ("dateKey")
);

-- CreateTable
CREATE TABLE "OpsExportJob" (
    "id" TEXT NOT NULL,
    "status" "OpsExportJobStatus" NOT NULL DEFAULT 'PENDING',
    "mode" "OpsExportMode" NOT NULL,
    "operatorDigest" TEXT NOT NULL,
    "filterSnapshot" JSONB,
    "applicationIds" TEXT[],
    "exportableCount" INTEGER NOT NULL DEFAULT 0,
    "excludedEmptyCount" INTEGER NOT NULL DEFAULT 0,
    "estimatedBytes" INTEGER NOT NULL DEFAULT 0,
    "entriesObjectKey" TEXT,
    "outputObjectKey" TEXT,
    "zipFileSize" INTEGER,
    "missingCount" INTEGER NOT NULL DEFAULT 0,
    "missingSummary" JSONB,
    "errorMessage" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpsExportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OpsExportJob_status_createdAt_idx" ON "OpsExportJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OpsExportJob_operatorDigest_status_idx" ON "OpsExportJob"("operatorDigest", "status");

-- CreateIndex
CREATE INDEX "OpsExportJob_leaseExpiresAt_idx" ON "OpsExportJob"("leaseExpiresAt");
