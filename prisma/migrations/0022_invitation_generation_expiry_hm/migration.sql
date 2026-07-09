-- AlterTable
ALTER TABLE "InvitationGenerationBatch"
ADD COLUMN "expiredHours" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "expiredMinutes" INTEGER NOT NULL DEFAULT 0;
