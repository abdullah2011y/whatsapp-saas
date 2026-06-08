/*
  Warnings:

  - The `status` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('BF', 'WA', 'RM');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProcessStatus" AS ENUM ('UNSHIPPED', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'RETURNED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "address1" TEXT,
ADD COLUMN     "address2" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "courierName" TEXT,
ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "orderName" TEXT,
ADD COLUMN     "orderNumber" INTEGER,
ADD COLUMN     "processStatus" "ProcessStatus" NOT NULL DEFAULT 'UNSHIPPED',
ADD COLUMN     "province" TEXT,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "shopifyCustomerId" TEXT,
ADD COLUMN     "shopifyOrderId" TEXT,
ADD COLUMN     "source" "OrderSource" NOT NULL DEFAULT 'BF',
ADD COLUMN     "trackingNumber" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "userId" TEXT,
ADD COLUMN     "zip" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Automation" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "trigger" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "templateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "whatsappNumber" TEXT,
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "lastSync" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "enabledProviders" TEXT NOT NULL DEFAULT 'BOTH',
    "defaultProvider" TEXT NOT NULL DEFAULT 'ASK',
    "metaBusinessAccountId" TEXT,
    "metaPhoneNumberId" TEXT,
    "metaAccessToken" TEXT,
    "metaVerifyToken" TEXT,
    "metaConnected" BOOLEAN NOT NULL DEFAULT false,
    "shopifyDomain" TEXT,
    "confirmationMethod" TEXT NOT NULL DEFAULT 'BUTTONS',
    "pollConfirmLabel" TEXT NOT NULL DEFAULT '✅ Yes Confirmed',
    "pollCancelLabel" TEXT NOT NULL DEFAULT '❌ No Cancelled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "connected" BOOLEAN NOT NULL DEFAULT false,
    "lastSync" TIMESTAMP(3),
    "sessionHealth" TEXT NOT NULL DEFAULT 'Healthy',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappPoll" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "optionsJson" TEXT NOT NULL,
    "messageSecret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappPoll_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Automation_userId_trigger_key" ON "Automation"("userId", "trigger");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_userId_key" ON "Settings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappSession_userId_key" ON "WhatsappSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappPoll_messageId_key" ON "WhatsappPoll"("messageId");

-- CreateIndex
CREATE INDEX "Order_source_idx" ON "Order"("source");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_processStatus_idx" ON "Order"("processStatus");

-- CreateIndex
CREATE INDEX "Order_phone_idx" ON "Order"("phone");

-- CreateIndex
CREATE INDEX "Order_customer_idx" ON "Order"("customer");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Order_orderNumber_idx" ON "Order"("orderNumber");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappSession" ADD CONSTRAINT "WhatsappSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappPoll" ADD CONSTRAINT "WhatsappPoll_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "Order_shopifyOrderId_key" ON "Order"("shopifyOrderId");
