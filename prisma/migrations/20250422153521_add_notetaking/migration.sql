-- CreateTable
CREATE TABLE "NoteTaking" (
    "id" TEXT NOT NULL,
    "patientActivityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteTaking_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "NoteTaking" ADD CONSTRAINT "NoteTaking_patientActivityId_fkey" FOREIGN KEY ("patientActivityId") REFERENCES "PatientActivity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
