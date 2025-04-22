-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BadgeType" ADD VALUE 'WATER_WIZARD_I';
ALTER TYPE "BadgeType" ADD VALUE 'WATER_WIZARD_II';
ALTER TYPE "BadgeType" ADD VALUE 'WATER_WIZARD_III';
ALTER TYPE "BadgeType" ADD VALUE 'WATER_WIZARD_IV';
ALTER TYPE "BadgeType" ADD VALUE 'WATER_WIZARD_V';
ALTER TYPE "BadgeType" ADD VALUE 'WATER_WIZARD_VI';
ALTER TYPE "BadgeType" ADD VALUE 'WATER_WIZARD_VII';
ALTER TYPE "BadgeType" ADD VALUE 'WATER_WIZARD_VIII';
ALTER TYPE "BadgeType" ADD VALUE 'WATER_WIZARD_IX';
