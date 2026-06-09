/*
  Warnings:

  - Made the column `userId` on table `Settings` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Automation" ADD COLUMN     "providerOverride" TEXT;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "shopifyWebhookSecret" TEXT,
ADD COLUMN     "shopifyWebhookStatus" TEXT NOT NULL DEFAULT 'INACTIVE',
ALTER COLUMN "userId" SET NOT NULL;
