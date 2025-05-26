-- DropForeignKey
ALTER TABLE "PatientActivity" DROP CONSTRAINT "PatientActivity_user_id_fkey";

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "day" INTEGER;

-- AddForeignKey
ALTER TABLE "PatientActivity" ADD CONSTRAINT "PatientActivity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
