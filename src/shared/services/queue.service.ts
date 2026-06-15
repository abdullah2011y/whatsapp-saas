import { Queue } from "bullmq";
import { redisConnection } from "../../config/redis";

export const whatsappQueue = new Queue("whatsapp-queue", { connection: redisConnection });
export const shopifyQueue = new Queue("shopify-queue", { connection: redisConnection });
export const notificationQueue = new Queue("notification-queue", { connection: redisConnection });
export const automationQueue = new Queue("automation-queue", { connection: redisConnection });

export async function queueWhatsAppMessage(userId: string, targetPhone: string, text: string, options?: any) {
  await whatsappQueue.add("send-message", { userId, targetPhone, text, options });
}

export async function queueShopifyWebhook(body: any, shopDomain: string | undefined, userId: string | undefined) {
  await shopifyQueue.add("process-webhook", { body, shopDomain, userId });
}

export async function queueNotification(userId: string, message: string, type: string = "INFO") {
  await notificationQueue.add("create-notification", { userId, message, type });
}

export async function queueAutomationTrigger(trigger: string, order: any) {
  await automationQueue.add("process-trigger", { trigger, order });
}
