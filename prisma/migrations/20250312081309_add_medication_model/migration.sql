-- CreateTable
CREATE TABLE "Medication" (
    "id" TEXT NOT NULL,
    "patientActivityId" TEXT NOT NULL,
    "medicationName" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "days" TEXT[],
    "times" TIMESTAMP(3)[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medication_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_patientActivityId_fkey" FOREIGN KEY ("patientActivityId") REFERENCES "PatientActivity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
