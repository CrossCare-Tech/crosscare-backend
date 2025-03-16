/*
  Warnings:

  - You are about to drop the column `completedDates` on the `Medication` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Medication" DROP COLUMN "completedDates";

-- AlterTable
ALTER TABLE "PatientActivity" ADD COLUMN     "completedDates" TEXT[] DEFAULT ARRAY[]::TEXT[];
