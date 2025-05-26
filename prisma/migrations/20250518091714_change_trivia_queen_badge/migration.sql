-- AlterEnum
ALTER TYPE "BadgeType" ADD VALUE 'GETTING_TO_KNOW_YOU';

-- DropForeignKey
ALTER TABLE "PatientBadge" DROP CONSTRAINT "PatientBadge_patientId_fkey";

-- AddForeignKey
ALTER TABLE "PatientBadge" ADD CONSTRAINT "PatientBadge_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
