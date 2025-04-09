-- CreateTable
CREATE TABLE "WombPicture" (
    "id" TEXT NOT NULL,
    "patientActivityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WombPicture_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WombPicture" ADD CONSTRAINT "WombPicture_patientActivityId_fkey" FOREIGN KEY ("patientActivityId") REFERENCES "PatientActivity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
