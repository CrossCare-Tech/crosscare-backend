-- CreateEnum
CREATE TYPE "HabitType" AS ENUM ('WATER', 'SLEEP', 'FOOD', 'STEPS');

-- CreateEnum
CREATE TYPE "BadgeType" AS ENUM ('HYDRATED_QUEEN', 'SNAPSHOT', 'HEART_SCRIBE', 'RESTED_DIVA', 'EXPLORER', 'MAMA_MILESTONE_I', 'MAMA_MILESTONE_II', 'MAMA_MILESTONE_III', 'MAMA_MILESTONE_IV', 'MAMA_MILESTONE_V', 'MAMA_MILESTONE_VI', 'TRIVIA_QUEEN', 'GETTING_TO_KNOW_YOU', 'WATER_WIZARD', 'WATER_WIZARD_I', 'WATER_WIZARD_II', 'WATER_WIZARD_III', 'WATER_WIZARD_IV', 'WATER_WIZARD_V', 'WATER_WIZARD_VI', 'WATER_WIZARD_VII', 'WATER_WIZARD_VIII', 'WATER_WIZARD_IX', 'SLEEP_WIZARD', 'SLEEP_WIZARD_I', 'SLEEP_WIZARD_II', 'SLEEP_WIZARD_III', 'SLEEP_WIZARD_IV', 'SLEEP_WIZARD_V', 'SLEEP_WIZARD_VI', 'SLEEP_WIZARD_VII', 'SLEEP_WIZARD_VIII', 'SLEEP_WIZARD_IX', 'HEALTH_QUEEN', 'HEALTH_QUEEN_I', 'HEALTH_QUEEN_II', 'HEALTH_QUEEN_III', 'HEALTH_QUEEN_IV', 'HEALTH_QUEEN_V', 'HEALTH_QUEEN_VI', 'HEALTH_QUEEN_VII', 'HEALTH_QUEEN_VIII', 'HEALTH_QUEEN_IX', 'ON_THE_MOVE', 'ON_THE_MOVE_I', 'ON_THE_MOVE_II', 'ON_THE_MOVE_III', 'ON_THE_MOVE_IV', 'ON_THE_MOVE_V', 'ON_THE_MOVE_VI', 'ON_THE_MOVE_VII', 'ON_THE_MOVE_VIII', 'ON_THE_MOVE_IX', 'HOT_MAMA');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

-- CreateEnum
CREATE TYPE "FoodClassification" AS ENUM ('GOOD', 'BAD');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('EXERCISES', 'AUDIOS', 'STORIES');

-- CreateEnum
CREATE TYPE "IconType" AS ENUM ('heart', 'landscape', 'none', 'moon', 'cloud', 'sun', 'feather');

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "phone_number" TEXT,
    "age" INTEGER,
    "profile_image" TEXT,
    "avatar_url" TEXT,
    "week" INTEGER,
    "day" INTEGER,
    "doctorId" TEXT,
    "waterGoal" INTEGER DEFAULT 10,
    "calorieGoal" INTEGER DEFAULT 2000,
    "stepsGoal" INTEGER,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationToken" TEXT,
    "emailTokenExpires" TIMESTAMP(3),
    "resetToken" TEXT,
    "resetTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_metrics" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "loginTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logoutTime" TIMESTAMP(3),
    "durationMinutes" DOUBLE PRECISION,

    CONSTRAINT "session_metrics_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "PatientActivity" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "weight" DOUBLE PRECISION,
    "weight_unit" TEXT,
    "water" INTEGER,
    "steps" INTEGER,
    "sleepStart" TIMESTAMP(3),
    "sleepEnd" TIMESTAMP(3),
    "heart_rate" DOUBLE PRECISION,
    "notetaking" TEXT,
    "wombPicture" TEXT,
    "calorieGoal" INTEGER,
    "caloriesConsumed" INTEGER,
    "goodFoodCount" INTEGER,
    "badFoodCount" INTEGER,
    "waterGoal" INTEGER,
    "stepsGoal" INTEGER,

    CONSTRAINT "PatientActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WombPicture" (
    "id" TEXT NOT NULL,
    "patientActivityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WombPicture_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "food_items" (
    "id" TEXT NOT NULL,
    "dailyMealId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "portion" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "calories" INTEGER NOT NULL,
    "classification" "FoodClassification" NOT NULL,
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
    "totalCalories" INTEGER NOT NULL,
    "isPublic" BOOLEAN NOT NULL,
    "usageCount" INTEGER NOT NULL,
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
    "calories" INTEGER NOT NULL,
    "classification" "FoodClassification" NOT NULL,

    CONSTRAINT "saved_meal_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_database" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "commonPortions" JSONB NOT NULL,
    "classification" "FoodClassification" NOT NULL,
    "caloriesPer100g" INTEGER NOT NULL,
    "protein" DOUBLE PRECISION,
    "carbohydrates" DOUBLE PRECISION,
    "fat" DOUBLE PRECISION,
    "isVerified" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_database_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalDocs" (
    "id" TEXT NOT NULL,
    "files" TEXT NOT NULL,

    CONSTRAINT "MedicalDocs_pkey" PRIMARY KEY ("id")
);

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
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedDates" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Medication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SelfCareCategory" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "iconType" "IconType" NOT NULL,
    "count" INTEGER NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "gradientStart" TEXT NOT NULL,
    "gradientMiddle" TEXT,
    "gradientEnd" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SelfCareCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "categoryId" TEXT NOT NULL,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Audio" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "duration" TEXT,
    "image" TEXT,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Audio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image" TEXT,
    "duration" TEXT,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionnaireDomain" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "QuestionnaireDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "possibleFlag" TEXT,
    "domainId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionResponse" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "flag" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "questionnaireId" TEXT,

    CONSTRAINT "QuestionResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Questionnaire" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Questionnaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "appointmentDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Patient_email_key" ON "Patient"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_email_key" ON "Doctor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_type_key" ON "Badge"("type");

-- CreateIndex
CREATE UNIQUE INDEX "PatientBadge_patientId_badgeId_key" ON "PatientBadge"("patientId", "badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "HabitBadge_patientId_badgeType_key" ON "HabitBadge"("patientId", "badgeType");

-- CreateIndex
CREATE UNIQUE INDEX "meal_patientActivityId_mealType_key" ON "meal"("patientActivityId", "mealType");

-- CreateIndex
CREATE UNIQUE INDEX "food_database_name_key" ON "food_database"("name");

-- AddForeignKey
ALTER TABLE "session_metrics" ADD CONSTRAINT "session_metrics_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientBadge" ADD CONSTRAINT "PatientBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientBadge" ADD CONSTRAINT "PatientBadge_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitBadge" ADD CONSTRAINT "HabitBadge_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientActivity" ADD CONSTRAINT "PatientActivity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WombPicture" ADD CONSTRAINT "WombPicture_patientActivityId_fkey" FOREIGN KEY ("patientActivityId") REFERENCES "PatientActivity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteTaking" ADD CONSTRAINT "NoteTaking_patientActivityId_fkey" FOREIGN KEY ("patientActivityId") REFERENCES "PatientActivity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal" ADD CONSTRAINT "meal_patientActivityId_fkey" FOREIGN KEY ("patientActivityId") REFERENCES "PatientActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_items" ADD CONSTRAINT "food_items_dailyMealId_fkey" FOREIGN KEY ("dailyMealId") REFERENCES "meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_meal_templates" ADD CONSTRAINT "saved_meal_templates_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_meal_items" ADD CONSTRAINT "saved_meal_items_savedMealId_fkey" FOREIGN KEY ("savedMealId") REFERENCES "saved_meal_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_patientActivityId_fkey" FOREIGN KEY ("patientActivityId") REFERENCES "PatientActivity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SelfCareCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audio" ADD CONSTRAINT "Audio_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SelfCareCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SelfCareCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "QuestionnaireDomain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionResponse" ADD CONSTRAINT "QuestionResponse_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionResponse" ADD CONSTRAINT "QuestionResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionResponse" ADD CONSTRAINT "QuestionResponse_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "Questionnaire"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Questionnaire" ADD CONSTRAINT "Questionnaire_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
