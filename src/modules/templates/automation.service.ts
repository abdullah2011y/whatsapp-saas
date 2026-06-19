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
    include: {
      template: {
        where: {
          userId: userId
        }
      }
    },
    orderBy: { trigger: "asc" }
  });
};

export const updateAutomation = async (
  userId: string,
  trigger: string,
  isEnabled: boolean,
  templateId: string | null,
  providerOverride: string | null = null
) => {
  // Enforce tenant isolation check: template must belong to this userId
  if (templateId) {
    const template = await prisma.template.findFirst({
      where: { id: templateId, userId }
    });
    if (!template) {
      throw new Error("Unauthorized: Selected template does not belong to the authenticated user");
    }
  }

  return await prisma.automation.upsert({
    where: {
      userId_trigger: {
        userId,
        trigger
      }
    },
    update: { isEnabled, templateId, providerOverride },
    create: { userId, trigger, isEnabled, templateId, providerOverride }
  });
};

const incrementMessageCount = async (userId: string) => {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { messagesThisMonth: { increment: 1 } }
    });
  } catch (err) {
    console.error("[Automation Service] Failed to increment message count:", err);
  }
};

export const triggerAutomation = async (triggerType: string, order: any) => {
  try {
    const userId = order.userId;
    if (!userId) {
      console.error(`[Automation Trigger] Error: Order ${order.id} has no userId. Tenant isolation requires a valid userId. Skipping execution.`);
      return;
    }
    console.log(`[Automation Trigger] Firing event "${triggerType}" for order ${order.orderName || order.id} under user ${userId}`);

    // Log the order information
    console.log(`[Automation Diagnostic Logs] order.id: ${order.id}`);
    console.log(`[Automation Diagnostic Logs] order.userId: ${userId}`);

    // Verify user subscription status and message limits
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { planRef: true }
    });

    if (user) {
      const isExpired = user.role !== "SUPERADMIN" && 
                        user.plan !== "Lifetime" && 
                        (user.status === "INACTIVE" || user.status === "ARCHIVED" || (user.expiresAt && new Date(user.expiresAt) < new Date()));
      if (isExpired) {
        console.log(`[Automation Trigger] Execution skipped: User ${user.role} (ID: ${userId}) subscription is expired or inactive.`);
        return;
      }

      if (user.role !== "SUPERADMIN") {
        const maxMessages = user.planRef ? user.planRef.maxMessages : 100;
        if (user.messagesThisMonth >= maxMessages) {
          console.log(`[Automation Trigger] Execution skipped: User ${user.email} (ID: ${userId}) has reached monthly message limit of ${maxMessages}.`);
          return;
        }
      }
    }

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
      include: {
        template: {
          where: {
            userId: userId
          }
        }
      }
    });

    // Output query details
    console.log(`[Automation Audit] Automation Query: prisma.automation.findUnique({ where: { userId_trigger: { userId: "${userId}", trigger: "${triggerType}" } }, include: { template: { where: { userId: "${userId}" } } } })`);
    console.log(`[Automation Audit] Selected Template ID: ${config?.template?.id || "N/A"}`);
    console.log(`[Automation Audit] Selected Template Owner ID: ${config?.template?.userId || "N/A"}`);
    console.log(`[Automation Audit] Order Owner ID: ${userId}`);

    // Log details
    console.log(`[Automation Diagnostic Logs] automation.userId: ${config?.userId || "N/A"}`);
    console.log(`[Automation Diagnostic Logs] template.id: ${config?.template?.id || "N/A"}`);
    console.log(`[Automation Diagnostic Logs] template.userId: ${config?.template?.userId || "N/A"}`);
    console.log(`[Automation Diagnostic Logs] template.name: ${config?.template?.name || "N/A"}`);

    if (config) {
      console.log(`[Automation Diagnostic] Automation selected for order: triggerType=${triggerType}, enabled=${config.isEnabled}`);
    } else {
      console.log(`[Automation Diagnostic] Automation selected for order: NONE for triggerType=${triggerType}`);
    }

    let isTemplateUsed = false;
    let templateName = "";
    let templateId = "";
    let templateContent = "";
    let renderedBody = "";

    if (config && config.isEnabled && config.templateId && config.template) {
      isTemplateUsed = true;
      templateName = config.template.name;
      templateId = config.template.id;
      templateContent = config.template.content;
      renderedBody = renderTemplate(templateContent, order);

      console.log(`[Automation Diagnostic] Template selected for order: ${templateName} (ID: ${templateId})`);
      console.log(`[Automation Diagnostic] Message generated from template: "${renderedBody}"`);
    } else {
      console.log(`[Automation Diagnostic] Template selected for order: NONE (Using Fallback)`);
    }

    // Resolve which provider to use based on connection states (Phase 6)
    const qrSession = await prisma.whatsappSession.findUnique({
      where: { userId }
    });

    const isMetaConnected = settings?.metaConnected || false;
    const isQrConnected = qrSession?.connected || false;

    let providerToUse = "META"; // Default fallback
    if (isMetaConnected && !isQrConnected) {
      providerToUse = "META";
    } else if (isQrConnected && !isMetaConnected) {
      providerToUse = "WEB";
    } else if (isMetaConnected && isQrConnected) {
      providerToUse = settings?.defaultProvider === "WEB" ? "WEB" : "META";
    } else {
      providerToUse = settings?.defaultProvider === "WEB" ? "WEB" : "META";
    }

    // Apply automation-level overrides (Phase 7)
    let resolvedProvider = providerToUse;
    if (config && config.providerOverride && config.providerOverride !== "DEFAULT") {
      resolvedProvider = config.providerOverride;
    }

    console.log(`[Automation Trigger] Connection states: Meta connected = ${isMetaConnected}, QR connected = ${isQrConnected}. Default Provider resolved: ${providerToUse}. Resolved Provider with Override: ${resolvedProvider}`);

    if (resolvedProvider === "WEB") {
      const confirmLabel = settings?.pollConfirmLabel || "✅ Yes Confirmed";
      const cancelLabel = settings?.pollCancelLabel || "❌ No Cancelled";

      if (triggerType === "ORDER_CREATED") {
        if (isTemplateUsed) {
          console.log(`[Automation Trigger] Dispatching WhatsApp Web poll confirmation with template to ${order.phone}...`);
          await sendBaileysPoll(userId, order.phone, renderedBody, [confirmLabel, cancelLabel], order.id);
          await incrementMessageCount(userId);
          console.log(`[FINAL_MESSAGE_SENT] Provider: WEB, Type: POLL, To: ${order.phone}, Content: ${renderedBody}`);
        } else {
          const storeName = settings?.brandName || settings?.companyName || user?.company || user?.name || "Store";
          const storeUrl = settings?.shopifyDomain || "";
          const storeUrlSuffix = storeUrl ? ` (${storeUrl})` : "";

          const fallbackText = `🛍️ ${storeName} Order Confirmation\n\n` +
            `Assalam O Alikum  ${order.customer} 👋\n\n` +
            `Apne ${storeName}${storeUrlSuffix} Sy : ${order.product} Order Kia Ha\n` +
            `Jiske Amount Hai: PKR ${order.amount}\n\n` +
            `Kindly Order Confirm Krden Taky Hum Further Process Kr Sken`;

          console.log(`[Automation Trigger] Dispatching WhatsApp Web text confirmation to ${order.phone}...`);
          await sendBaileysTextMessage(userId, order.phone, fallbackText);
          await incrementMessageCount(userId);
          console.log(`[FINAL_MESSAGE_SENT] Provider: WEB, Type: TEXT, To: ${order.phone}, Content: ${fallbackText}`);

          console.log(`[Automation Trigger] Dispatching WhatsApp Web poll confirmation to ${order.phone}...`);
          await sendBaileysPoll(userId, order.phone, "Confirm your order:", [confirmLabel, cancelLabel], order.id);
          await incrementMessageCount(userId);
          console.log(`[FINAL_MESSAGE_SENT] Provider: WEB, Type: POLL, To: ${order.phone}, Content: Confirm your order:`);
        }
      } else {
        // Other triggers: send plain text if configured
        if (isTemplateUsed) {
          console.log(`[Automation Trigger] Dispatching WhatsApp Web notification message to ${order.phone}...`);
          await sendBaileysTextMessage(userId, order.phone, renderedBody);
          await incrementMessageCount(userId);
          console.log(`[FINAL_MESSAGE_SENT] Provider: WEB, Type: TEXT, To: ${order.phone}, Content: ${renderedBody}`);
        } else {
          console.log(`[Automation Trigger] Trigger ${triggerType} is disabled or not configured, skipping.`);
        }
      }
    } else {
      // META Cloud API
      if (triggerType === "ORDER_CREATED") {
        if (isTemplateUsed) {
          console.log(`[Automation Trigger] Dispatching Meta interactive confirmation to ${order.phone}...`);
          await sendOrderMessage(order, renderedBody);
          await incrementMessageCount(userId);
          console.log(`[FINAL_MESSAGE_SENT] Provider: META, Type: INTERACTIVE, To: ${order.phone}, Content: ${renderedBody}`);
        } else {
          const storeName = settings?.brandName || settings?.companyName || user?.company || user?.name || "Store";
          const fallbackText = `🛍️ ${storeName} Order Confirmation\n\n` +
            `Assalamualaikum ${order.customer} 👋\n\n` +
            `📦 Product: ${order.product}\n` +
            `💰 Amount: Rs ${order.amount}\n\n` +
            `Please confirm your order below 👇`;

          console.log(`[Automation Trigger] Fallback to Meta interactive button confirmation message`);
          await sendOrderMessage(order, fallbackText);
          await incrementMessageCount(userId);
          console.log(`[FINAL_MESSAGE_SENT] Provider: META, Type: INTERACTIVE, To: ${order.phone}, Content: ${fallbackText}`);
        }
      } else {
        // Other triggers
        if (isTemplateUsed) {
          console.log(`[Automation Trigger] Dispatching Meta text notification message to ${order.phone}...`);
          await sendTextMessage(order.phone, renderedBody, userId);
          await incrementMessageCount(userId);
          console.log(`[FINAL_MESSAGE_SENT] Provider: META, Type: TEXT, To: ${order.phone}, Content: ${renderedBody}`);
        } else {
          console.log(`[Automation Trigger] Trigger ${triggerType} is disabled or not configured, skipping.`);
        }
      }
    }
  } catch (error) {
    console.error(`[Automation Trigger] Execution failed for event "${triggerType}":`, error);
  }
};
