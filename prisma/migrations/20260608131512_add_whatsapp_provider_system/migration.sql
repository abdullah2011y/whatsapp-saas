-- 1. Create Enums Safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderSource') THEN
        CREATE TYPE "OrderSource" AS ENUM ('BF', 'WA', 'RM');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') THEN
        CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProcessStatus') THEN
        CREATE TYPE "ProcessStatus" AS ENUM ('UNSHIPPED', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'RETURNED');
    END IF;
END$$;

-- 2. Alter Order Table Safely
ALTER TABLE "Order" 
  ADD COLUMN IF NOT EXISTS "address1" TEXT,
  ADD COLUMN IF NOT EXISTS "address2" TEXT,
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ADD COLUMN IF NOT EXISTS "country" TEXT,
  ADD COLUMN IF NOT EXISTS "courierName" TEXT,
  ADD COLUMN IF NOT EXISTS "customerEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "notes" TEXT,
  ADD COLUMN IF NOT EXISTS "orderName" TEXT,
  ADD COLUMN IF NOT EXISTS "orderNumber" INTEGER,
  ADD COLUMN IF NOT EXISTS "processStatus" "ProcessStatus" NOT NULL DEFAULT 'UNSHIPPED',
  ADD COLUMN IF NOT EXISTS "province" TEXT,
  ADD COLUMN IF NOT EXISTS "quantity" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "shopifyCustomerId" TEXT,
  ADD COLUMN IF NOT EXISTS "shopifyOrderId" TEXT,
  ADD COLUMN IF NOT EXISTS "source" "OrderSource" NOT NULL DEFAULT 'BF',
  ADD COLUMN IF NOT EXISTS "trackingNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "userId" TEXT,
  ADD COLUMN IF NOT EXISTS "zip" TEXT;

-- Safe conversion of status column from TEXT to OrderStatus enum
DO $$
BEGIN
    IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'Order' AND column_name = 'status') = 'character varying' 
       OR (SELECT data_type FROM information_schema.columns WHERE table_name = 'Order' AND column_name = 'status') = 'text' THEN
        ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus" USING "status"::"OrderStatus";
    END IF;
END$$;

-- 3. Create/Alter User, Template, Automation, Settings Tables Safely
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Ensure Template has userId
CREATE TABLE IF NOT EXISTS "Template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Ensure Automation has userId
CREATE TABLE IF NOT EXISTS "Automation" (
    "id" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "templateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Automation" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Ensure Settings has userId and other columns
CREATE TABLE IF NOT EXISTS "Settings" (
    "id" TEXT NOT NULL,
    "whatsappNumber" TEXT,
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "lastSync" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Settings" 
  ADD COLUMN IF NOT EXISTS "userId" TEXT,
  ADD COLUMN IF NOT EXISTS "enabledProviders" TEXT NOT NULL DEFAULT 'BOTH',
  ADD COLUMN IF NOT EXISTS "defaultProvider" TEXT NOT NULL DEFAULT 'ASK',
  ADD COLUMN IF NOT EXISTS "metaBusinessAccountId" TEXT,
  ADD COLUMN IF NOT EXISTS "metaPhoneNumberId" TEXT,
  ADD COLUMN IF NOT EXISTS "metaAccessToken" TEXT,
  ADD COLUMN IF NOT EXISTS "metaVerifyToken" TEXT,
  ADD COLUMN IF NOT EXISTS "metaConnected" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "shopifyDomain" TEXT,
  ADD COLUMN IF NOT EXISTS "confirmationMethod" TEXT NOT NULL DEFAULT 'BUTTONS',
  ADD COLUMN IF NOT EXISTS "pollConfirmLabel" TEXT NOT NULL DEFAULT '✅ Yes Confirmed',
  ADD COLUMN IF NOT EXISTS "pollCancelLabel" TEXT NOT NULL DEFAULT '❌ No Cancelled',
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 4. Create New Whatsapp Tables Safely
CREATE TABLE IF NOT EXISTS "WhatsappSession" (
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

CREATE TABLE IF NOT EXISTS "WhatsappPoll" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "optionsJson" TEXT NOT NULL,
    "messageSecret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappPoll_pkey" PRIMARY KEY ("id")
);

-- 5. Create Indexes Safely
DROP INDEX IF EXISTS "User_email_key";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

DROP INDEX IF EXISTS "Automation_userId_trigger_key";
CREATE UNIQUE INDEX "Automation_userId_trigger_key" ON "Automation"("userId", "trigger");

DROP INDEX IF EXISTS "Settings_userId_key";
CREATE UNIQUE INDEX "Settings_userId_key" ON "Settings"("userId");

DROP INDEX IF EXISTS "WhatsappSession_userId_key";
CREATE UNIQUE INDEX "WhatsappSession_userId_key" ON "WhatsappSession"("userId");

DROP INDEX IF EXISTS "WhatsappPoll_messageId_key";
CREATE UNIQUE INDEX "WhatsappPoll_messageId_key" ON "WhatsappPoll"("messageId");

CREATE INDEX IF NOT EXISTS "Order_source_idx" ON "Order"("source");
CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status");
CREATE INDEX IF NOT EXISTS "Order_processStatus_idx" ON "Order"("processStatus");
CREATE INDEX IF NOT EXISTS "Order_phone_idx" ON "Order"("phone");
CREATE INDEX IF NOT EXISTS "Order_customer_idx" ON "Order"("customer");
CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX IF NOT EXISTS "Order_orderNumber_idx" ON "Order"("orderNumber");

DROP INDEX IF EXISTS "Order_shopifyOrderId_key";
CREATE UNIQUE INDEX "Order_shopifyOrderId_key" ON "Order"("shopifyOrderId");

-- 6. Foreign Key Constraints Safely
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_userId_fkey";
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Template" DROP CONSTRAINT IF EXISTS "Template_userId_fkey";
ALTER TABLE "Template" ADD CONSTRAINT "Template_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Automation" DROP CONSTRAINT IF EXISTS "Automation_userId_fkey";
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Automation" DROP CONSTRAINT IF EXISTS "Automation_templateId_fkey";
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Settings" DROP CONSTRAINT IF EXISTS "Settings_userId_fkey";
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WhatsappSession" DROP CONSTRAINT IF EXISTS "WhatsappSession_userId_fkey";
ALTER TABLE "WhatsappSession" ADD CONSTRAINT "WhatsappSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WhatsappPoll" DROP CONSTRAINT IF EXISTS "WhatsappPoll_userId_fkey";
ALTER TABLE "WhatsappPoll" ADD CONSTRAINT "WhatsappPoll_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
