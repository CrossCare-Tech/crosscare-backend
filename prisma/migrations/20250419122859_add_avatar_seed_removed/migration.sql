/*
  Warnings:

  - You are about to drop the column `hairstyleId` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `outfitId` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the `AvatarCombination` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AvatarFaceCombination` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Hairstyle` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Outfit` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserHairstyle` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserOutfit` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AvatarCombination" DROP CONSTRAINT "AvatarCombination_hairstyleId_fkey";

-- DropForeignKey
ALTER TABLE "AvatarCombination" DROP CONSTRAINT "AvatarCombination_outfitId_fkey";

-- DropForeignKey
ALTER TABLE "AvatarFaceCombination" DROP CONSTRAINT "AvatarFaceCombination_hairstyleId_fkey";

-- DropForeignKey
ALTER TABLE "AvatarFaceCombination" DROP CONSTRAINT "AvatarFaceCombination_outfitId_fkey";

-- DropForeignKey
ALTER TABLE "Patient" DROP CONSTRAINT "Patient_hairstyleId_fkey";

-- DropForeignKey
ALTER TABLE "Patient" DROP CONSTRAINT "Patient_outfitId_fkey";

-- DropForeignKey
ALTER TABLE "UserHairstyle" DROP CONSTRAINT "UserHairstyle_hairstyleId_fkey";

-- DropForeignKey
ALTER TABLE "UserHairstyle" DROP CONSTRAINT "UserHairstyle_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserOutfit" DROP CONSTRAINT "UserOutfit_outfitId_fkey";

-- DropForeignKey
ALTER TABLE "UserOutfit" DROP CONSTRAINT "UserOutfit_userId_fkey";

-- AlterTable
ALTER TABLE "Patient" DROP COLUMN "hairstyleId",
DROP COLUMN "outfitId";

-- DropTable
DROP TABLE "AvatarCombination";

-- DropTable
DROP TABLE "AvatarFaceCombination";

-- DropTable
DROP TABLE "Hairstyle";

-- DropTable
DROP TABLE "Outfit";

-- DropTable
DROP TABLE "UserHairstyle";

-- DropTable
DROP TABLE "UserOutfit";
