-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "hairstyleId" INTEGER,
ADD COLUMN     "outfitId" INTEGER;

-- CreateTable
CREATE TABLE "Hairstyle" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "unlockLevel" INTEGER NOT NULL DEFAULT 1,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "grayScale" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hairstyle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outfit" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "unlockLevel" INTEGER NOT NULL DEFAULT 1,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "grayScale" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Outfit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserHairstyle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hairstyleId" INTEGER NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserHairstyle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserOutfit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "outfitId" INTEGER NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserOutfit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvatarCombination" (
    "id" TEXT NOT NULL,
    "hairstyleId" INTEGER NOT NULL,
    "outfitId" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvatarCombination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvatarFaceCombination" (
    "id" TEXT NOT NULL,
    "hairstyleId" INTEGER NOT NULL,
    "outfitId" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvatarFaceCombination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserHairstyle_userId_hairstyleId_key" ON "UserHairstyle"("userId", "hairstyleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserOutfit_userId_outfitId_key" ON "UserOutfit"("userId", "outfitId");

-- CreateIndex
CREATE UNIQUE INDEX "AvatarCombination_hairstyleId_outfitId_key" ON "AvatarCombination"("hairstyleId", "outfitId");

-- CreateIndex
CREATE UNIQUE INDEX "AvatarFaceCombination_hairstyleId_outfitId_key" ON "AvatarFaceCombination"("hairstyleId", "outfitId");

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_hairstyleId_fkey" FOREIGN KEY ("hairstyleId") REFERENCES "Hairstyle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_outfitId_fkey" FOREIGN KEY ("outfitId") REFERENCES "Outfit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserHairstyle" ADD CONSTRAINT "UserHairstyle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserHairstyle" ADD CONSTRAINT "UserHairstyle_hairstyleId_fkey" FOREIGN KEY ("hairstyleId") REFERENCES "Hairstyle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserOutfit" ADD CONSTRAINT "UserOutfit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserOutfit" ADD CONSTRAINT "UserOutfit_outfitId_fkey" FOREIGN KEY ("outfitId") REFERENCES "Outfit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvatarCombination" ADD CONSTRAINT "AvatarCombination_hairstyleId_fkey" FOREIGN KEY ("hairstyleId") REFERENCES "Hairstyle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvatarCombination" ADD CONSTRAINT "AvatarCombination_outfitId_fkey" FOREIGN KEY ("outfitId") REFERENCES "Outfit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvatarFaceCombination" ADD CONSTRAINT "AvatarFaceCombination_hairstyleId_fkey" FOREIGN KEY ("hairstyleId") REFERENCES "Hairstyle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvatarFaceCombination" ADD CONSTRAINT "AvatarFaceCombination_outfitId_fkey" FOREIGN KEY ("outfitId") REFERENCES "Outfit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
