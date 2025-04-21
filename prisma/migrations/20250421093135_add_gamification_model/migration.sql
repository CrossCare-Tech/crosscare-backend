-- CreateEnum
CREATE TYPE "HabitType" AS ENUM ('WATER', 'SLEEP', 'FOOD', 'STEPS');

-- CreateEnum
CREATE TYPE "BadgeType" AS ENUM ('HYDRATED_QUEEN', 'SNAPSHOT', 'HEART_SCRIBE', 'RESTED_DIVA', 'EXPLORER', 'MAMA_MILESTONE_I', 'MAMA_MILESTONE_II', 'MAMA_MILESTONE_III', 'MAMA_MILESTONE_IV', 'MAMA_MILESTONE_V', 'MAMA_MILESTONE_VI', 'WATER_WIZARD', 'SLEEP_WIZARD', 'HEALTH_QUEEN', 'ON_THE_MOVE', 'HOT_MAMA');

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "type" "BadgeType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientBadge" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitBadge" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "habit" "HabitType" NOT NULL,
    "badgeType" "BadgeType" NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HabitBadge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Badge_type_key" ON "Badge"("type");

-- CreateIndex
CREATE UNIQUE INDEX "PatientBadge_patientId_badgeId_key" ON "PatientBadge"("patientId", "badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "HabitBadge_patientId_badgeType_key" ON "HabitBadge"("patientId", "badgeType");

-- AddForeignKey
ALTER TABLE "PatientBadge" ADD CONSTRAINT "PatientBadge_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientBadge" ADD CONSTRAINT "PatientBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitBadge" ADD CONSTRAINT "HabitBadge_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
