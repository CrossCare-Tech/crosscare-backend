/*
  Warnings:

  - You are about to drop the `meals` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "food_items" DROP CONSTRAINT "food_items_dailyMealId_fkey";

-- DropForeignKey
ALTER TABLE "meals" DROP CONSTRAINT "meals_patientActivityId_fkey";

-- AlterTable
ALTER TABLE "PatientActivity" ALTER COLUMN "badFoodCount" DROP DEFAULT,
ALTER COLUMN "calorieGoal" DROP DEFAULT,
ALTER COLUMN "caloriesConsumed" DROP DEFAULT,
ALTER COLUMN "goodFoodCount" DROP DEFAULT;

-- AlterTable
ALTER TABLE "food_database" ALTER COLUMN "classification" DROP DEFAULT,
ALTER COLUMN "isVerified" DROP DEFAULT;

-- AlterTable
ALTER TABLE "food_items" ALTER COLUMN "calories" DROP DEFAULT,
ALTER COLUMN "classification" DROP DEFAULT;

-- AlterTable
ALTER TABLE "saved_meal_items" ALTER COLUMN "calories" DROP DEFAULT,
ALTER COLUMN "classification" DROP DEFAULT;

-- AlterTable
ALTER TABLE "saved_meal_templates" ALTER COLUMN "totalCalories" DROP DEFAULT,
ALTER COLUMN "isPublic" DROP DEFAULT,
ALTER COLUMN "usageCount" DROP DEFAULT;

-- DropTable
DROP TABLE "meals";

-- CreateTable
CREATE TABLE "meal" (
    "id" TEXT NOT NULL,
    "patientActivityId" TEXT NOT NULL,
    "mealType" "MealType" NOT NULL,
    "totalCalories" INTEGER NOT NULL,
    "foodItemsCount" INTEGER NOT NULL,
    "isSavedAsMeal" BOOLEAN NOT NULL,
    "savedMealName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meal_patientActivityId_mealType_key" ON "meal"("patientActivityId", "mealType");

-- AddForeignKey
ALTER TABLE "meal" ADD CONSTRAINT "meal_patientActivityId_fkey" FOREIGN KEY ("patientActivityId") REFERENCES "PatientActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_items" ADD CONSTRAINT "food_items_dailyMealId_fkey" FOREIGN KEY ("dailyMealId") REFERENCES "meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
