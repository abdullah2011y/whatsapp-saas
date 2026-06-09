-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "shopifyConnectionHealth" TEXT NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "shopifyLastWebhookAt" TIMESTAMP(3),
ADD COLUMN     "shopifyStoreDetected" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "defaultProvider" SET DEFAULT 'META';

-- AlterTable
ALTER TABLE "WhatsappSession" ADD COLUMN     "sessionData" TEXT;
