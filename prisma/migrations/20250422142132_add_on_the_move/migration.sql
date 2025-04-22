-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BadgeType" ADD VALUE 'HEALTH_QUEEN_I';
ALTER TYPE "BadgeType" ADD VALUE 'HEALTH_QUEEN_II';
ALTER TYPE "BadgeType" ADD VALUE 'HEALTH_QUEEN_III';
ALTER TYPE "BadgeType" ADD VALUE 'HEALTH_QUEEN_IV';
ALTER TYPE "BadgeType" ADD VALUE 'HEALTH_QUEEN_V';
ALTER TYPE "BadgeType" ADD VALUE 'HEALTH_QUEEN_VI';
ALTER TYPE "BadgeType" ADD VALUE 'HEALTH_QUEEN_VII';
ALTER TYPE "BadgeType" ADD VALUE 'HEALTH_QUEEN_VIII';
ALTER TYPE "BadgeType" ADD VALUE 'HEALTH_QUEEN_IX';
ALTER TYPE "BadgeType" ADD VALUE 'ON_THE_MOVE_I';
ALTER TYPE "BadgeType" ADD VALUE 'ON_THE_MOVE_II';
ALTER TYPE "BadgeType" ADD VALUE 'ON_THE_MOVE_III';
ALTER TYPE "BadgeType" ADD VALUE 'ON_THE_MOVE_IV';
ALTER TYPE "BadgeType" ADD VALUE 'ON_THE_MOVE_V';
ALTER TYPE "BadgeType" ADD VALUE 'ON_THE_MOVE_VI';
ALTER TYPE "BadgeType" ADD VALUE 'ON_THE_MOVE_VII';
ALTER TYPE "BadgeType" ADD VALUE 'ON_THE_MOVE_VIII';
ALTER TYPE "BadgeType" ADD VALUE 'ON_THE_MOVE_IX';
