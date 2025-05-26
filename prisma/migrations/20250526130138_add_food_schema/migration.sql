/*
  Warnings:

  - You are about to drop the `Meals` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

-- CreateEnum
CREATE TYPE "FoodClassification" AS ENUM ('GOOD', 'BAD');

-- DropForeignKey
ALTER TABLE "Meals" DROP CONSTRAINT "Meals_user_activity_id_fkey";

-- AlterTable
ALTER TABLE "PatientActivity" ADD COLUMN     "badFoodCount" INTEGER DEFAULT 0,
ADD COLUMN     "calorieGoal" INTEGER DEFAULT 0,
ADD COLUMN     "caloriesConsumed" INTEGER DEFAULT 0,
ADD COLUMN     "goodFoodCount" INTEGER DEFAULT 0;

-- DropTable
DROP TABLE "Meals";

-- CreateTable
CREATE TABLE "meals" (
    "id" TEXT NOT NULL,
    "patientActivityId" TEXT NOT NULL,
    "mealType" "MealType" NOT NULL,
    "totalCalories" INTEGER NOT NULL DEFAULT 0,
    "foodItemsCount" INTEGER NOT NULL DEFAULT 0,
    "isSavedAsMeal" BOOLEAN NOT NULL DEFAULT false,
    "savedMealName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_items" (
    "id" TEXT NOT NULL,
    "dailyMealId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "portion" TEXT NOT NULL,
    "calories" INTEGER NOT NULL DEFAULT 0,
    "classification" "FoodClassification" NOT NULL DEFAULT 'GOOD',
    "protein" DOUBLE PRECISION,
    "carbohydrates" DOUBLE PRECISION,
    "fat" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_meal_templates" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mealType" "MealType" NOT NULL,
    "description" TEXT,
    "totalCalories" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_meal_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_meal_items" (
    "id" TEXT NOT NULL,
    "savedMealId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "portion" TEXT NOT NULL,
    "calories" INTEGER NOT NULL DEFAULT 0,
    "classification" "FoodClassification" NOT NULL DEFAULT 'GOOD',

    CONSTRAINT "saved_meal_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_database" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "commonPortions" JSONB NOT NULL,
    "classification" "FoodClassification" NOT NULL DEFAULT 'GOOD',
    "caloriesPer100g" INTEGER NOT NULL,
    "protein" DOUBLE PRECISION,
    "carbohydrates" DOUBLE PRECISION,
    "fat" DOUBLE PRECISION,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_database_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meals_patientActivityId_mealType_key" ON "meals"("patientActivityId", "mealType");

-- CreateIndex
CREATE UNIQUE INDEX "food_database_name_key" ON "food_database"("name");

-- AddForeignKey
ALTER TABLE "meals" ADD CONSTRAINT "meals_patientActivityId_fkey" FOREIGN KEY ("patientActivityId") REFERENCES "PatientActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_items" ADD CONSTRAINT "food_items_dailyMealId_fkey" FOREIGN KEY ("dailyMealId") REFERENCES "meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_meal_templates" ADD CONSTRAINT "saved_meal_templates_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_meal_items" ADD CONSTRAINT "saved_meal_items_savedMealId_fkey" FOREIGN KEY ("savedMealId") REFERENCES "saved_meal_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
