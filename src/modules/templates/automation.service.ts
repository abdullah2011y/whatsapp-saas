import prisma from "../../config/database";
import { sendTextMessage, sendOrderMessage } from "../../integrations/whatsapp.service";
import { renderTemplate } from "./template.service";
import { sendBaileysPoll, sendBaileysTextMessage } from "../whatsapp/baileys.manager";

const DEFAULT_USER_ID = "97e2acb1-0bee-4b31-be9e-3e31f8b4a916";

const TRIGGERS = [
  "ORDER_CREATED",
  "ORDER_CONFIRMED",
  "ORDER_CANCELLED",
  "ORDER_SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED"
];

// Helper to seed/initialize default automation configurations
export const initializeAutomations = async (userId: string) => {
  for (const trigger of TRIGGERS) {
    await prisma.automation.upsert({
      where: {
        userId_trigger: {
          userId,
          trigger
        }
      },
      update: {},
      create: {
        userId,
        trigger,
        isEnabled: false,
        templateId: null
      }
    });
  }
};

export const getAutomations = async (userId: string) => {
  await initializeAutomations(userId);
  return await prisma.automation.findMany({
    where: { userId },
    include: { template: true },
    orderBy: { trigger: "asc" }
  });
};

export const updateAutomation = async (
  userId: string,
  trigger: string,
  isEnabled: boolean,
  templateId: string | null
) => {
  return await prisma.automation.upsert({
    where: {
      userId_trigger: {
        userId,
        trigger
      }
    },
    update: { isEnabled, templateId },
    create: { userId, trigger, isEnabled, templateId }
  });
};

export const triggerAutomation = async (triggerType: string, order: any) => {
  try {
    const userId = order.userId || DEFAULT_USER_ID;
    console.log(`[Automation Trigger] Firing event "${triggerType}" for order ${order.orderName || order.id} under user ${userId}`);
    
    const settings = await prisma.settings.findUnique({
      where: { userId }
    });

    const config = await prisma.automation.findUnique({
      where: {
        userId_trigger: {
          userId,
          trigger: triggerType
        }
      },
      include: { template: true }
    });

    // Resolve which provider to use
    let providerToUse = "META";
    if (settings) {
      if (settings.enabledProviders === "WEB") {
        providerToUse = "WEB";
      } else if (settings.enabledProviders === "BOTH") {
        if (settings.defaultProvider === "WEB") {
          providerToUse = "WEB";
        } else if (settings.defaultProvider === "ASK") {
          const qrSession = await prisma.whatsappSession.findUnique({
            where: { userId }
          });
          if (qrSession?.connected) {
            providerToUse = "WEB";
          }
        }
      }
    }

    console.log(`[Automation Trigger] Selected Provider: ${providerToUse}`);

    if (providerToUse === "WEB") {
      const confirmLabel = settings?.pollConfirmLabel || "✅ Yes Confirmed";
      const cancelLabel = settings?.pollCancelLabel || "❌ No Cancelled";

      if (triggerType === "ORDER_CREATED") {
        let textMsg = "";
        if (config && config.isEnabled && config.templateId && config.template) {
          textMsg = renderTemplate(config.template.content, order);
        } else {
          textMsg = `🛍️ ByteForge Order Confirmation\n\n` +
            `Assalamualaikum ${order.customer} 👋\n\n` +
            `📦 Product: ${order.product}\n` +
            `💰 Amount: Rs ${order.amount}\n\n` +
            `Please confirm your order below 👇`;
        }

        console.log(`[Automation Trigger] Dispatching WhatsApp Web text confirmation to ${order.phone}...`);
        await sendBaileysTextMessage(userId, order.phone, textMsg);

        console.log(`[Automation Trigger] Dispatching WhatsApp Web poll confirmation to ${order.phone}...`);
        await sendBaileysPoll(userId, order.phone, "Confirm your order:", [confirmLabel, cancelLabel], order.id);
      } else {
        // Other triggers: send plain text if configured
        if (config && config.isEnabled && config.templateId && config.template) {
          const renderedBody = renderTemplate(config.template.content, order);
          console.log(`[Automation Trigger] Dispatching WhatsApp Web notification message to ${order.phone}...`);
          await sendBaileysTextMessage(userId, order.phone, renderedBody);
        } else {
          console.log(`[Automation Trigger] Trigger ${triggerType} is disabled or not configured, skipping.`);
        }
      }
    } else {
      // META Cloud API
      if (triggerType === "ORDER_CREATED") {
        if (config && config.isEnabled && config.templateId && config.template) {
          const renderedBody = renderTemplate(config.template.content, order);
          console.log(`[Automation Trigger] Dispatching Meta text confirmation to ${order.phone}...`);
          await sendTextMessage(order.phone, renderedBody, userId);
        } else {
          console.log(`[Automation Trigger] Fallback to Meta interactive button confirmation message`);
          await sendOrderMessage(order);
        }
      } else {
        // Other triggers
        if (config && config.isEnabled && config.templateId && config.template) {
          const renderedBody = renderTemplate(config.template.content, order);
          console.log(`[Automation Trigger] Dispatching Meta text notification message to ${order.phone}...`);
          await sendTextMessage(order.phone, renderedBody, userId);
        } else {
          console.log(`[Automation Trigger] Trigger ${triggerType} is disabled or not configured, skipping.`);
        }
      }
    }
  } catch (error) {
    console.error(`[Automation Trigger] Execution failed for event "${triggerType}":`, error);
  }
};
