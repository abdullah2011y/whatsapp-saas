import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import axios from "axios";

const router = Router();
const prisma = new PrismaClient();

// Get WhatsApp Status
router.get("/status", async (req, res) => {
  try {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneNumberId) {
      return res.status(400).json({ error: "Missing WhatsApp credentials in environment" });
    }

    let connected = false;
    let status = "DISCONNECTED";

    try {
      // Test Graph API connection
      const response = await axios.get(`https://graph.facebook.com/v17.0/${phoneNumberId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data && response.data.id === phoneNumberId) {
        connected = true;
        status = "CONNECTED";
      }
    } catch (apiError: any) {
      console.error("WhatsApp API Error:", apiError?.response?.data || apiError.message);
    }

    res.json({
      connected: connected,
      status: status,
      phoneNumberId: phoneNumberId,
      webhook: true
    });
  } catch (error) {
    console.error("Error fetching WhatsApp status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Mock sending a WhatsApp message
router.post("/send", async (req, res) => {
  const { orderId, templateId, previewContent } = req.body;
  // In a real scenario, we would use the WhatsApp Cloud API here.
  // For now, we simulate a successful send.
  try {
    console.log(`[WhatsApp API] Message sent for Order ${orderId} using Template ${templateId}`);
    res.json({ success: true, message: "Message sent successfully to WhatsApp" });
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
