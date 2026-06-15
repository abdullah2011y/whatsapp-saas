import { Worker } from "bullmq";
import { redisConnection } from "./redis";
import prisma from "./database";
import { sendBaileysTextMessage, sendBaileysPoll } from "../modules/whatsapp/baileys.manager";
import { handleShopifyOrderCreate } from "../modules/shopify/shopify.service";
import { triggerAutomation } from "../modules/templates/automation.service";

export function startWorkers() {
  console.log("[Workers] Starting queue workers...");

  // 1. WhatsApp Queue Worker
  new Worker("whatsapp-queue", async (job) => {
    const { userId, targetPhone, text, options } = job.data;
    console.log(`[Workers] Processing job ${job.id} on whatsapp-queue for user ${userId}`);
    
    // Check usage limits
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { planRef: true }
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    if (user.planRef) {
      if (user.messagesThisMonth >= user.planRef.maxMessages) {
        console.warn(`[Workers] Message skipped: User ${userId} has exceeded WhatsApp message limits.`);
        await prisma.notification.create({
          data: {
            userId,
            message: "Outbound message skipped: monthly WhatsApp message limit reached for your plan.",
            type: "WARNING"
          }
        });
        return { status: "LIMIT_REACHED" };
      }
    }

    if (options && options.isPoll) {
      await sendBaileysPoll(userId, targetPhone, options.roseQuestion, options.pollOptions, options.orderId);
    } else {
      await sendBaileysTextMessage(userId, targetPhone, text);
    }

    // Increment count
    await prisma.user.update({
      where: { id: userId },
      data: { messagesThisMonth: { increment: 1 } }
    });

    return { success: true };
  }, { connection: redisConnection });

  // 2. Shopify Queue Worker
  new Worker("shopify-queue", async (job) => {
    const { body, shopDomain, userId } = job.data;
    console.log(`[Workers] Processing job ${job.id} on shopify-queue for user ${userId || "unknown"}`);

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { planRef: true }
      });

      if (user && user.planRef) {
        if (user.ordersThisMonth >= user.planRef.maxOrders) {
          console.warn(`[Workers] Order sync skipped: User ${userId} has exceeded monthly order limit.`);
          await prisma.notification.create({
            data: {
              userId,
              message: "Incoming order sync skipped: monthly order limit reached for your plan.",
              type: "WARNING"
            }
          });
          return { status: "LIMIT_REACHED" };
        }
      }
    }

    await handleShopifyOrderCreate(body, shopDomain, userId);

    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          ordersThisMonth: { increment: 1 },
          shopifyOrdersSynced: { increment: 1 }
        }
      });

      await prisma.settings.update({
        where: { userId },
        data: {
          shopifyLastWebhookAt: new Date(),
          shopifyConnectionHealth: "HEALTHY",
          shopifyStoreDetected: true
        }
      });
    }

    return { success: true };
  }, { connection: redisConnection });

  // 3. Notification Queue Worker
  new Worker("notification-queue", async (job) => {
    const { userId, message, type } = job.data;
    console.log(`[Workers] Processing job ${job.id} on notification-queue for user ${userId}`);

    await prisma.notification.create({
      data: {
        userId,
        message,
        type: type || "INFO"
      }
    });

    return { success: true };
  }, { connection: redisConnection });

  // 4. Automation Queue Worker
  new Worker("automation-queue", async (job) => {
    const { trigger, order } = job.data;
    console.log(`[Workers] Processing job ${job.id} on automation-queue for event ${trigger}`);

    await triggerAutomation(trigger, order);
    return { success: true };
  }, { connection: redisConnection });
}
