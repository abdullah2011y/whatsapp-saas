import prisma from "../../config/database";
import { sendTextMessage } from "../../integrations/whatsapp.service";
import { sendBaileysTextMessage } from "../../modules/whatsapp/baileys.manager";

export async function sendUserWhatsAppNotification(userId: string, message: string) {
  try {
    const settings = await prisma.settings.findUnique({
      where: { userId },
    });

    if (!settings || !settings.whatsappNumber) {
      console.log(`[WhatsApp Notification] No phone number configured for user ${userId}`);
      return;
    }

    const qrSession = await prisma.whatsappSession.findUnique({
      where: { userId },
    });

    const isMetaConnected = settings.metaConnected || false;
    const isQrConnected = qrSession?.connected || false;
    const phone = settings.whatsappNumber;

    if (isMetaConnected) {
      console.log(`[WhatsApp Notification] Sending Meta WhatsApp warning to ${phone}...`);
      await sendTextMessage(phone, message, userId);
    } else if (isQrConnected) {
      console.log(`[WhatsApp Notification] Sending Baileys WhatsApp warning to ${phone}...`);
      await sendBaileysTextMessage(userId, phone, message);
    } else {
      console.log(`[WhatsApp Notification] Skip sending: WhatsApp not connected for user ${userId}`);
    }
  } catch (error) {
    console.error(`[WhatsApp Notification] Failed to send WhatsApp notification to user ${userId}:`, error);
  }
}
