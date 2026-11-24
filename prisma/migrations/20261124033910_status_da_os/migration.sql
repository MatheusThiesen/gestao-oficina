-- AlterTable
ALTER TABLE "Quote" ADD COLUMN "refusalReason" TEXT;
ALTER TABLE "Quote" ADD COLUMN "refusedAt" DATETIME;

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN "cancelReason" TEXT;
ALTER TABLE "WorkOrder" ADD COLUMN "exitKm" INTEGER;
