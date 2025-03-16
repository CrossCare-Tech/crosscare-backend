-- AlterTable
ALTER TABLE "Medication" ADD COLUMN     "completedDates" TEXT[] DEFAULT ARRAY[]::TEXT[];
