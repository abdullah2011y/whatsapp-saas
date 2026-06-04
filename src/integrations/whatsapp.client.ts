import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export const sendWhatsApp = async (
  to: string,
  message: string
) => {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: {
          body: message,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("WhatsApp sent:", response.data);

    return response.data;
  } catch (error: any) {
    console.error(
      "WhatsApp Error:",
      error.response?.data || error.message
    );
  }
};