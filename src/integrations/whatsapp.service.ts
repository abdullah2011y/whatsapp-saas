import axios from "axios";

export const sendOrderMessage = async (order: any) => {
  try {
    await axios.post(
      `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: order.phone,
        type: "interactive",

        interactive: {
          type: "button",

          body: {
            text:
              `🛍️ ByteForge Order Confirmation\n\n` +
              `Assalamualaikum ${order.customer} 👋\n\n` +
              `📦 Product: ${order.product}\n` +
              `💰 Amount: Rs ${order.amount}\n\n` +
              `Please confirm your order below 👇`,
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
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Interactive message sent");
  } catch (error: any) {
    console.log(error.response?.data || error.message);
  }
};

export const sendTextMessage = async (phone: string, bodyText: string) => {
  try {
    await axios.post(
      `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
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
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
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