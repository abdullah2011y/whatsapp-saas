import prisma from "../../config/database";
import { sendTextMessage, sendOrderMessage } from "../../integrations/whatsapp.service";
import { renderTemplate } from "./template.service";

const TRIGGERS = [
  "ORDER_CREATED",
  "ORDER_CONFIRMED",
  "ORDER_CANCELLED",
  "ORDER_SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED"
];

// Helper to seed/initialize default automation configurations
export const initializeAutomations = async () => {
  for (const trigger of TRIGGERS) {
    await prisma.automation.upsert({
      where: { trigger },
      update: {},
      create: {
        trigger,
        isEnabled: false,
        templateId: null
      }
    });
  }
};

export const getAutomations = async () => {
  await initializeAutomations();
  return await prisma.automation.findMany({
    include: { template: true },
    orderBy: { trigger: "asc" }
  });
};

export const updateAutomation = async (
  trigger: string,
  isEnabled: boolean,
  templateId: string | null
) => {
  return await prisma.automation.upsert({
    where: { trigger },
    update: { isEnabled, templateId },
    create: { trigger, isEnabled, templateId }
  });
};

export const triggerAutomation = async (triggerType: string, order: any) => {
  try {
    console.log(`[Automation Trigger] Firing event "${triggerType}" for order ${order.orderName || order.id}`);
    
    const config = await prisma.automation.findUnique({
      where: { trigger: triggerType },
      include: { template: true }
    });

    if (!config || !config.isEnabled) {
      console.log(`[Automation Trigger] Trigger "${triggerType}" is disabled or not configured.`);
      
      // Fallback for ORDER_CREATED: if trigger is disabled or has no template, send default interactive confirmation message
      if (triggerType === "ORDER_CREATED") {
        console.log(`[Automation Trigger] Fallback to default interactive confirmation message`);
        await sendOrderMessage(order);
      }
      return;
    }

    if (!config.templateId || !config.template) {
      console.log(`[Automation Trigger] Trigger "${triggerType}" is enabled but has no template linked.`);
      if (triggerType === "ORDER_CREATED") {
        console.log(`[Automation Trigger] Fallback to default interactive confirmation message`);
        await sendOrderMessage(order);
      }
      return;
    }

    // Render and send the template
    const renderedBody = renderTemplate(config.template.content, order);
    console.log(`[Automation Trigger] Rendered message body:\n${renderedBody}`);

    await sendTextMessage(order.phone, renderedBody);
    console.log(`[Automation Trigger] WhatsApp message successfully dispatched to ${order.phone}`);
  } catch (error) {
    console.error(`[Automation Trigger] Execution failed for event "${triggerType}":`, error);
  }
};
