import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import axios from "axios";
import { authMiddleware, AuthenticatedRequest } from "../auth/auth.middleware";
import { encrypt, decrypt } from "../../shared/lib/crypto";
import {
  connectUser,
  disconnectUser,
  deleteUserSession,
  getSessionStatus,
  normalizePhoneNumber,
  getJid
} from "./baileys.manager";

const router = Router();
const prisma = new PrismaClient();

// POST /whatsapp/debug-send (Public debug endpoint)
router.post("/debug-send", async (req: any, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: "Phone number is required in request body" });
    }

    // Resolve userId: try current user or fallback to first connected session
    let userId: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";
        const decoded = (await import("jsonwebtoken")).default.verify(token, JWT_SECRET) as { id: string; email: string };
        userId = decoded.id;
      } catch (err) {
        console.warn("[Debug Send] Auth header present but invalid, proceeding to fallback:", err);
      }
    }

    if (!userId) {
      const activeSession = await prisma.whatsappSession.findFirst({
        where: { connected: true }
      });
      if (activeSession) {
        userId = activeSession.userId;
        console.log(`[Debug Send] Resolved fallback userId: ${userId} from active session`);
      }
    }

    if (!userId) {
      return res.status(400).json({ error: "No active connected WhatsApp Web session found on the system." });
    }

    const sock = await connectUser(userId);
    if (!sock) {
      return res.status(400).json({ error: "WhatsApp Web session could not be retrieved or is not connected." });
    }

    const normalized = normalizePhoneNumber(phone);
    const jid = getJid(phone);

    console.log(`Original phone: ${phone}`);
    console.log(`Normalized phone: ${normalized}`);
    console.log(`Final JID: ${jid}`);

    let checkResult;
    try {
      checkResult = await sock.onWhatsApp(jid);
    } catch (err: any) {
      console.error(`[Debug Send] onWhatsApp check failed:`, err);
      return res.status(500).json({ error: "Failed to perform onWhatsApp check", details: err.message || err });
    }

    const exists = checkResult && checkResult[0] ? checkResult[0].exists : false;
    console.log(`Recipient exists: ${exists}`);

    if (!exists) {
      console.log(`[Debug Send] Stop sending: Recipient JID ${jid} does not exist on WhatsApp.`);
      return res.status(400).json({ 
        error: `Recipient JID ${jid} does not exist on WhatsApp`,
        originalPhone: phone,
        normalizedPhone: normalized,
        finalJid: jid,
        exists: false
      });
    }

    const textPayload = { text: "Debug test message from SaaS" };
    const sentType = "TEXT_DEBUG";

    console.log(`[Debug Send] Provider used: WhatsApp Web (Baileys)`);
    console.log(`[Debug Send] Message type being sent: ${sentType}`);
    console.log(`[Debug Send] Final payload shape:`, JSON.stringify(textPayload, null, 2));

    try {
      const response = await sock.sendMessage(jid, textPayload);
      console.log(`[Debug Send] Send success: true`);
      console.log(`[Debug Send] Complete response:`, JSON.stringify(response, null, 2));
      
      console.log(`Response message key:`, JSON.stringify(response?.key));
      console.log(`Response remoteJid:`, response?.key?.remoteJid);
      console.log(`Response messageId:`, response?.key?.id);
      console.log(`Response status:`, response?.status);

      return res.json({
        success: true,
        originalPhone: phone,
        normalizedPhone: normalized,
        finalJid: jid,
        exists: true,
        response
      });
    } catch (sendErr: any) {
      console.log(`[Debug Send] Send success: false`);
      console.error(`[Debug Send] sendMessage error:`, sendErr.message || sendErr);
      return res.status(500).json({
        success: false,
        error: "Failed to send message via Baileys",
        details: sendErr.message || sendErr
      });
    }
  } catch (error: any) {
    console.error("[Debug Send] Unexpected error:", error);
    res.status(500).json({ error: "Internal server error", details: error.message || error });
  }
});

import { licenseMiddleware } from "../../shared/middlewares/license.middleware";

// Apply auth middleware to all routes below in this router
router.use(authMiddleware as any);
router.use(licenseMiddleware as any);

// GET /whatsapp/overview
router.get("/overview", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;

    const settings = await prisma.settings.findUnique({
      where: { userId }
    });

    const session = await prisma.whatsappSession.findUnique({
      where: { userId }
    });

    const templatesCount = await prisma.template.count({
      where: { userId }
    });

    const automationsCount = await prisma.automation.count({
      where: { userId, isEnabled: true }
    });

    const recentOrders = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5
    });

    const qrStatus = getSessionStatus(userId);

    // Format recent activity
    const recentActivity = recentOrders.map(order => ({
      id: order.id,
      customer: order.customer,
      orderName: order.orderName,
      status: order.status,
      time: order.createdAt
    }));

    res.json({
      metaConnected: settings?.metaConnected || false,
      qrConnected: session?.connected || false,
      qrStatus: qrStatus.status,
      sessionHealth: session?.sessionHealth || "N/A",
      connectedNumber: session?.phoneNumber || settings?.whatsappNumber || null,
      defaultProvider: settings?.defaultProvider || "ASK",
      templatesCount,
      automationsCount,
      recentActivity
    });
  } catch (error: any) {
    console.error("Overview error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /whatsapp/settings
router.get("/settings", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const settings = await prisma.settings.findUnique({
      where: { userId }
    });

    res.json({
      enabledProviders: settings?.enabledProviders || "BOTH",
      defaultProvider: settings?.defaultProvider || "ASK",
      confirmationMethod: settings?.confirmationMethod || "BUTTONS",
      pollConfirmLabel: settings?.pollConfirmLabel || "✅ Yes Confirmed",
      pollCancelLabel: settings?.pollCancelLabel || "❌ No Cancelled",
      shopifyDomain: settings?.shopifyDomain || "",
      verifyToken: settings?.metaVerifyToken || ""
    });
  } catch (error: any) {
    console.error("Get settings error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /whatsapp/settings
router.post("/settings", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const { enabledProviders, defaultProvider, confirmationMethod, pollConfirmLabel, pollCancelLabel, shopifyDomain, verifyToken } = req.body;

    const normalizedDomain = shopifyDomain 
      ? shopifyDomain.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/+$/, "")
      : null;

    const settings = await prisma.settings.upsert({
      where: { userId },
      update: {
        enabledProviders,
        defaultProvider,
        confirmationMethod,
        pollConfirmLabel,
        pollCancelLabel,
        shopifyDomain: normalizedDomain,
        metaVerifyToken: verifyToken
      },
      create: {
        userId,
        enabledProviders,
        defaultProvider,
        confirmationMethod,
        pollConfirmLabel,
        pollCancelLabel,
        shopifyDomain: normalizedDomain,
        metaVerifyToken: verifyToken
      }
    });

    res.json(settings);
  } catch (error: any) {
    console.error("Save settings error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /whatsapp/meta/status
router.get("/meta/status", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const settings = await prisma.settings.findUnique({
      where: { userId }
    });

    let maskedToken = null;
    if (settings?.metaAccessToken) {
      const decrypted = decrypt(settings.metaAccessToken);
      if (decrypted) {
        maskedToken = decrypted.length > 4 
          ? `****************${decrypted.slice(-4)}`
          : "****************";
      }
    }

    res.json({
      businessAccountId: settings?.metaBusinessAccountId || "",
      phoneNumberId: settings?.metaPhoneNumberId || "",
      verifyToken: settings?.metaVerifyToken || "",
      accessToken: maskedToken,
      connected: settings?.metaConnected || false
    });
  } catch (error: any) {
    console.error("Meta status error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /whatsapp/meta/save
router.post("/meta/save", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const { businessAccountId, phoneNumberId, accessToken, verifyToken } = req.body;

    const existingSettings = await prisma.settings.findUnique({
      where: { userId }
    });

    let encryptedToken = existingSettings?.metaAccessToken;

    // Only encrypt if a new token was actually passed (not the masked one)
    if (accessToken && !accessToken.startsWith("***")) {
      encryptedToken = encrypt(accessToken);
    }

    await prisma.settings.upsert({
      where: { userId },
      update: {
        metaBusinessAccountId: businessAccountId,
        metaPhoneNumberId: phoneNumberId,
        metaAccessToken: encryptedToken,
        metaVerifyToken: verifyToken
      },
      create: {
        userId,
        metaBusinessAccountId: businessAccountId,
        metaPhoneNumberId: phoneNumberId,
        metaAccessToken: encryptedToken,
        metaVerifyToken: verifyToken
      }
    });

    res.json({ success: true, message: "Meta API credentials saved." });
  } catch (error: any) {
    console.error("Meta save error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /whatsapp/meta/test
router.post("/meta/test", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    
    const settings = await prisma.settings.findUnique({
      where: { userId }
    });

    if (!settings || !settings.metaPhoneNumberId || !settings.metaAccessToken) {
      return res.status(400).json({ error: "Meta Phone ID or Access Token is missing." });
    }

    const token = decrypt(settings.metaAccessToken);
    const phoneNumberId = settings.metaPhoneNumberId;

    try {
      const response = await axios.get(`https://graph.facebook.com/v17.0/${phoneNumberId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data && response.data.id === phoneNumberId) {
        await prisma.settings.update({
          where: { userId },
          data: { metaConnected: true }
        });
        return res.json({ success: true, message: "Connection successful." });
      } else {
        throw new Error("Invalid response from Meta API");
      }
    } catch (apiError: any) {
      console.error("Meta test API failure:", apiError?.response?.data || apiError.message);
      await prisma.settings.update({
        where: { userId },
        data: { metaConnected: false }
      });
      return res.status(400).json({ 
        error: "Meta API connection failed. Please check your credentials.", 
        details: apiError?.response?.data || apiError.message 
      });
    }
  } catch (error: any) {
    console.error("Meta test error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /whatsapp/meta/disconnect
router.post("/meta/disconnect", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    await prisma.settings.update({
      where: { userId },
      data: {
        metaConnected: false,
        metaAccessToken: null,
        metaBusinessAccountId: null,
        metaPhoneNumberId: null,
        metaVerifyToken: null
      }
    });
    res.json({ success: true, message: "Meta API disconnected." });
  } catch (error: any) {
    console.error("Meta disconnect error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /whatsapp/web/connect
router.post("/web/connect", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    connectUser(userId).catch((err) => {
      console.error(`Error connecting user ${userId}:`, err);
    });
    res.json({ success: true, message: "WhatsApp Web QR Code generation initiated." });
  } catch (error: any) {
    console.error("Web connect error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /whatsapp/web/qr
router.get("/web/qr", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const status = getSessionStatus(userId);
    res.json({ status: status.status, qr: status.qr });
  } catch (error: any) {
    console.error("Web QR error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /whatsapp/web/status
router.get("/web/status", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const status = getSessionStatus(userId);
    const session = await prisma.whatsappSession.findUnique({
      where: { userId }
    });

    res.json({
      status: status.status,
      connected: session?.connected || false,
      phoneNumber: session?.phoneNumber || null,
      lastSync: session?.lastSync || null,
      sessionHealth: session?.sessionHealth || "N/A"
    });
  } catch (error: any) {
    console.error("Web status error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /whatsapp/web/disconnect
router.post("/web/disconnect", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    await deleteUserSession(userId);
    res.json({ success: true, message: "WhatsApp Web disconnected and session deleted." });
  } catch (error: any) {
    console.error("Web disconnect error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /whatsapp/sessions
router.get("/sessions", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const session = await prisma.whatsappSession.findUnique({
      where: { userId }
    });
    const settings = await prisma.settings.findUnique({
      where: { userId }
    });

    const sessions = [];

    if (settings?.metaConnected) {
      sessions.push({
        id: "meta",
        provider: "Meta Cloud API",
        phoneNumber: settings.metaPhoneNumberId || "Unknown ID",
        connectedTime: settings.updatedAt,
        lastActivity: new Date(),
        status: "CONNECTED"
      });
    }

    if (session?.connected) {
      sessions.push({
        id: "web",
        provider: "WhatsApp Web (Baileys)",
        phoneNumber: session.phoneNumber || "Unknown Number",
        connectedTime: session.updatedAt,
        lastActivity: session.lastSync || new Date(),
        status: "CONNECTED"
      });
    }

    res.json(sessions);
  } catch (error: any) {
    console.error("Get sessions error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /whatsapp/sessions/:id
router.delete("/sessions/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const id = req.params.id;

    if (id === "meta") {
      await prisma.settings.update({
        where: { userId },
        data: { metaConnected: false }
      });
      return res.json({ success: true, message: "Meta API session deleted." });
    } else if (id === "web") {
      await deleteUserSession(userId);
      return res.json({ success: true, message: "WhatsApp Web session deleted." });
    } else {
      return res.status(400).json({ error: "Invalid session ID" });
    }
  } catch (error: any) {
    console.error("Delete session error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /whatsapp/webhook/regenerate-token
router.post("/webhook/regenerate-token", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const crypto = await import("crypto");
    const newToken = crypto.randomBytes(8).toString("hex");

    await prisma.settings.upsert({
      where: { userId },
      update: { metaVerifyToken: newToken },
      create: { userId, metaVerifyToken: newToken }
    });

    res.json({ success: true, verifyToken: newToken });
  } catch (error: any) {
    console.error("Regenerate verify token error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /whatsapp/webhook/test
router.post("/webhook/test", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const settings = await prisma.settings.findUnique({
      where: { userId }
    });

    if (!settings || !settings.metaVerifyToken) {
      return res.status(400).json({ error: "Verify token is missing. Please save settings first." });
    }

    const verifyToken = settings.metaVerifyToken;
    const localWebhookUrl = `http://localhost:5000/webhook`;

    try {
      const response = await axios.get(localWebhookUrl, {
        params: {
          "hub.mode": "subscribe",
          "hub.verify_token": verifyToken,
          "hub.challenge": "verification_loopback_success_123"
        }
      });

      if (response.status === 200 && response.data === "verification_loopback_success_123") {
        return res.json({ success: true, message: "Webhook loopback verification test passed successfully." });
      } else {
        return res.status(400).json({ 
          error: "Webhook responded with unexpected content.", 
          details: `Expected 'verification_loopback_success_123' but got: '${response.data}'` 
        });
      }
    } catch (apiError: any) {
      console.error("Local webhook test API failure:", apiError.message);
      return res.status(400).json({ 
        error: "Failed to connect to local webhook endpoint.", 
        details: apiError.message 
      });
    }
  } catch (error: any) {
    console.error("Webhook test error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
