-- AlterTable
ALTER TABLE "WhatsappPoll" ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'WEB',
ADD COLUMN     "remoteJid" TEXT;
