-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "age" INTEGER,
    "doctorId" TEXT,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Doctor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientActivity" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "weight_unit" TEXT NOT NULL,
    "water" INTEGER NOT NULL,
    "steps" INTEGER NOT NULL,
    "sleepStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sleepEnd" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "heart_rate" DOUBLE PRECISION NOT NULL,
    "notetaking" TEXT NOT NULL,
    "wombPicture" TEXT NOT NULL,

    CONSTRAINT "PatientActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meals" (
    "mealId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "user_activity_id" TEXT NOT NULL,

    CONSTRAINT "Meals_pkey" PRIMARY KEY ("mealId")
);

-- CreateTable
CREATE TABLE "MedicalDocs" (
    "id" TEXT NOT NULL,
    "files" TEXT NOT NULL,

    CONSTRAINT "MedicalDocs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Patient_email_key" ON "Patient"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_email_key" ON "Doctor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Meals_user_activity_id_mealId_key" ON "Meals"("user_activity_id", "mealId");

-- AddForeignKey
ALTER TABLE "PatientActivity" ADD CONSTRAINT "PatientActivity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meals" ADD CONSTRAINT "Meals_user_activity_id_fkey" FOREIGN KEY ("user_activity_id") REFERENCES "PatientActivity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
