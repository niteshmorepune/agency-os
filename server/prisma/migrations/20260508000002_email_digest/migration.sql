-- CreateEnum
CREATE TYPE "ReportSchedule" AS ENUM ('NONE', 'MONTHLY');

-- AlterTable Client
ALTER TABLE "Client" ADD COLUMN "reportSchedule" "ReportSchedule" NOT NULL DEFAULT 'NONE';
ALTER TABLE "Client" ADD COLUMN "lastReportEmailedAt" TIMESTAMP(3);

-- CreateTable AgencyDigest
CREATE TABLE "AgencyDigest" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "weekLabel" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgencyDigest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AgencyDigest" ADD CONSTRAINT "AgencyDigest_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
