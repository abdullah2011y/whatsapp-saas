import axios from "axios";
import { PrismaClient } from "@prisma/client";
import { decrypt } from "../shared/lib/crypto";

const prisma = new PrismaClient();
const DEFAULT_USER_ID = "97e2acb1-0bee-4b31-be9e-3e31f8b4a916";

const getMetaCredentials = async (userId: string) => {
  const settings = await prisma.settings.findUnique({
    where: { userId }
  });

  const token = settings?.metaAccessToken 
    ? decrypt(settings.metaAccessToken) 
    : process.env.WHATSAPP_TOKEN;
  const phoneNumberId = settings?.metaPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;

  return { token, phoneNumberId };
};

export const sendOrderMessage = async (order: any, bodyText?: string) => {
  try {
    const userId = order.userId;
    if (!userId) {
      console.error("[WhatsApp Service] Error: Order has no userId. Tenant isolation requires a valid userId. Skipping sendOrderMessage.");
      return;
    }
    const { token, phoneNumberId } = await getMetaCredentials(userId);

    if (!token || !phoneNumberId) {
      console.error("[WhatsApp Service] Missing Meta credentials for user", userId);
      return;
    }

    // Retrieve settings/user to resolve store/brand name dynamically for fallback
    const settings = await prisma.settings.findUnique({
      where: { userId }
    });
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    const storeName = settings?.brandName || settings?.companyName || user?.company || user?.name || "Store";

    const textContent = bodyText || (
      `🛍️ ${storeName} Order Confirmation\n\n` +
      `Assalamualaikum ${order.customer} 👋\n\n` +
      `📦 Product: ${order.product}\n` +
      `💰 Amount: Rs ${order.amount}\n\n` +
      `Please confirm your order below 👇`
    );

    await axios.post(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to: order.phone,
        type: "interactive",

        interactive: {
          type: "button",

          body: {
            text: textContent,
          },

          action: {
            buttons: [
              {
                type: "reply",

                reply: {
                  id: `confirm_${order.id}`,
                  title: "✅ Confirm",
                },
              },

              {
                type: "reply",

                reply: {
                  id: `cancel_${order.id}`,
                  title: "❌ Cancel",
                },
              },
            ],
          },
        },
      },

      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Interactive message sent");
  } catch (error: any) {
    console.log(error.response?.data || error.message);
  }
};

export const sendTextMessage = async (phone: string, bodyText: string, userId?: string) => {
  try {
    const finalUserId = userId;
    if (!finalUserId) {
      console.error("[WhatsApp Service] Error: No userId provided. Tenant isolation requires a valid userId. Skipping sendTextMessage.");
      return;
    }
    const { token, phoneNumberId } = await getMetaCredentials(finalUserId);

    if (!token || !phoneNumberId) {
      console.error("[WhatsApp Service] Missing Meta credentials for user", finalUserId);
      return;
    }

    await axios.post(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone,
        type: "text",
        text: {
          preview_url: false,
          body: bodyText,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("[WhatsApp Service] Text message sent to", phone);
  } catch (error: any) {
    console.error("[WhatsApp Service] Text message send failure:", error.response?.data || error.message);
    throw error;
  }
};