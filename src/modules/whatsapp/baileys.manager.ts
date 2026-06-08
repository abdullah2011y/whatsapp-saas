import { PrismaClient } from "@prisma/client";
import { updateOrderStatus } from "../orders/order.service";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const prisma = new PrismaClient();

// In-memory cache for QR codes and connection sockets
const activeConnections = new Map<string, any>();
const qrCache = new Map<string, string>();
const statusCache = new Map<string, string>(); // "DISCONNECTED", "QR", "CONNECTED", "CONNECTING"

// Dynamically loaded Baileys imports to prevent CommonJS vs ESM require compile issues
let makeWASocket: any;
let DisconnectReason: any;
let useMultiFileAuthState: any;
let jidNormalizedUser: any;
let decryptPollVote: any;

const loadBaileys = async () => {
  if (makeWASocket) return;
  const baileys = await import("@whiskeysockets/baileys");
  makeWASocket = baileys.default || baileys;
  DisconnectReason = baileys.DisconnectReason;
  useMultiFileAuthState = baileys.useMultiFileAuthState;
  jidNormalizedUser = baileys.jidNormalizedUser;
  decryptPollVote = baileys.decryptPollVote;
};

// Helper to compute SHA-256 hash (as used by WA for poll options)
const getSHA256 = (text: string): string => {
  return crypto.createHash("sha256").update(text).digest("hex");
};

export const getSessionStatus = (userId: string) => {
  const socket = activeConnections.get(userId);
  const status = statusCache.get(userId) || "DISCONNECTED";
  const qr = qrCache.get(userId) || null;
  return {
    status,
    qr,
    hasSocket: !!socket
  };
};

export const disconnectUser = async (userId: string) => {
  await loadBaileys();
  console.log(`[Baileys Manager] Disconnecting user ${userId}`);
  const conn = activeConnections.get(userId);
  if (conn) {
    try {
      conn.ev.removeAllListeners("connection.update");
      conn.ev.removeAllListeners("creds.update");
      conn.ev.removeAllListeners("messages.upsert");
      conn.end();
    } catch (e) {
      console.error(`[Baileys Manager] Error closing socket for ${userId}:`, e);
    }
    activeConnections.delete(userId);
  }
  qrCache.delete(userId);
  statusCache.set(userId, "DISCONNECTED");

  // Update DB status
  await prisma.whatsappSession.upsert({
    where: { userId },
    update: { connected: false },
    create: { userId, connected: false }
  });
};

export const deleteUserSession = async (userId: string) => {
  await disconnectUser(userId);
  const sessionPath = path.join(process.cwd(), "sessions", userId);
  if (fs.existsSync(sessionPath)) {
    try {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      console.log(`[Baileys Manager] Deleted session directory for user ${userId}`);
    } catch (e) {
      console.error(`[Baileys Manager] Error deleting directory for ${userId}:`, e);
    }
  }
};

export const connectUser = async (userId: string) => {
  await loadBaileys();
  if (activeConnections.has(userId)) {
    console.log(`[Baileys Manager] Connection already active for user ${userId}`);
    return activeConnections.get(userId);
  }

  console.log(`[Baileys Manager] Starting Baileys connection for user ${userId}...`);
  statusCache.set(userId, "CONNECTING");
  qrCache.delete(userId);

  const sessionPath = path.join(process.cwd(), "sessions", userId);
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    defaultQueryTimeoutMs: undefined
  });

  activeConnections.set(userId, sock);

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update: any) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      statusCache.set(userId, "QR");
      try {
        const qrDataUrl = await QRCode.toDataURL(qr);
        qrCache.set(userId, qrDataUrl);
      } catch (err) {
        console.error(`[Baileys Manager] QR generation error for ${userId}:`, err);
      }
    }

    if (connection === "close") {
      qrCache.delete(userId);
      const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(`[Baileys Manager] Connection closed for user ${userId}. Reason: ${lastDisconnect?.error}. Reconnecting: ${shouldReconnect}`);

      activeConnections.delete(userId);

      if (shouldReconnect) {
        statusCache.set(userId, "CONNECTING");
        setTimeout(() => connectUser(userId), 3000);
      } else {
        statusCache.set(userId, "DISCONNECTED");
        await prisma.whatsappSession.upsert({
          where: { userId },
          update: { connected: false, phoneNumber: null },
          create: { userId, connected: false, phoneNumber: null }
        });
        await deleteUserSession(userId);
      }
    } else if (connection === "open") {
      console.log(`[Baileys Manager] Connection successful for user ${userId}`);
      statusCache.set(userId, "CONNECTED");
      qrCache.delete(userId);

      const phoneJid = sock.user?.id;
      const cleanPhone = phoneJid ? phoneJid.split(":")[0] : null;

      await prisma.whatsappSession.upsert({
        where: { userId },
        update: {
          connected: true,
          phoneNumber: cleanPhone,
          lastSync: new Date(),
          sessionHealth: "Healthy"
        },
        create: {
          userId,
          connected: true,
          phoneNumber: cleanPhone,
          lastSync: new Date(),
          sessionHealth: "Healthy"
        }
      });
    }
  });

  sock.ev.on("messages.upsert", async (m: any) => {
    const msg = m.messages[0];
    if (!msg || msg.key.fromMe) return;

    const jid = msg.key.remoteJid;
    if (!jid) return;

    console.log(`[Baileys Manager] Received message from ${jid}`);

    if (msg.message?.pollUpdateMessage) {
      const pollUpdate = msg.message.pollUpdateMessage;
      const creationKey = pollUpdate.pollCreationMessageKey;
      if (!creationKey || !creationKey.id) return;

      console.log(`[Baileys Manager] Detected poll vote for message ID: ${creationKey.id}`);

      const dbPoll = await prisma.whatsappPoll.findUnique({
        where: { messageId: creationKey.id }
      });

      if (!dbPoll) {
        console.log(`[Baileys Manager] Poll not found in database for message ID: ${creationKey.id}`);
        return;
      }

      try {
        const pollEncKey = Buffer.from(dbPoll.messageSecret, "base64");
        const creatorJid = jidNormalizedUser(sock.user?.id || "");
        const voterJid = jidNormalizedUser(msg.key.participant || msg.key.remoteJid || "");

        console.log(`[Baileys Manager] Decrypting vote. Creator JID: ${creatorJid}, Voter JID: ${voterJid}`);

        const decrypted = decryptPollVote(pollUpdate.vote as any, {
          pollEncKey,
          pollCreatorJid: creatorJid,
          pollMsgId: creationKey.id,
          voterJid
        });

        console.log(`[Baileys Manager] Decrypted vote payload:`, decrypted);

        if (decrypted && decrypted.selectedOptions && decrypted.selectedOptions.length > 0) {
          const optionsMap = JSON.parse(dbPoll.optionsJson) as Record<string, string>; // label -> hash
          
          const selectedHash = decrypted.selectedOptions[0];
          const selectedHashHex = typeof selectedHash === "string" 
            ? selectedHash 
            : Buffer.from(selectedHash as any).toString("hex");
          
          let selectedLabel = "";
          for (const [label, hash] of Object.entries(optionsMap)) {
            if (hash === selectedHashHex) {
              selectedLabel = label;
              break;
            }
          }

          console.log(`[Baileys Manager] Match found for option hash ${selectedHashHex}: "${selectedLabel}"`);

          if (selectedLabel) {
            const userSettings = await prisma.settings.findUnique({
              where: { userId: dbPoll.userId }
            });

            const confirmLabel = userSettings?.pollConfirmLabel || "✅ Yes Confirmed";
            const cancelLabel = userSettings?.pollCancelLabel || "❌ No Cancelled";

            if (selectedLabel === confirmLabel) {
              console.log(`[Baileys Manager] Voter confirmed order ${dbPoll.orderId}`);
              await updateOrderStatus(dbPoll.orderId, "CONFIRMED");
            } else if (selectedLabel === cancelLabel) {
              console.log(`[Baileys Manager] Voter cancelled order ${dbPoll.orderId}`);
              await updateOrderStatus(dbPoll.orderId, "CANCELLED");
            }
          }
        }
      } catch (err) {
        console.error(`[Baileys Manager] Error decrypting poll vote:`, err);
      }
    }
  });

  return sock;
};

export const sendBaileysPoll = async (
  userId: string,
  phone: string,
  roseQuestion: string,
  options: string[],
  orderId: string
) => {
  await loadBaileys();
  const sock = activeConnections.get(userId);
  if (!sock) {
    throw new Error("WhatsApp Web is not connected for this user");
  }

  let cleanPhone = phone.replace(/\D/g, "");
  if (!cleanPhone.endsWith("@s.whatsapp.net")) {
    cleanPhone = `${cleanPhone}@s.whatsapp.net`;
  }

  console.log(`[Baileys Manager] Sending poll confirmation to ${cleanPhone} for order ${orderId}`);

  const pollCreationMessage = {
    name: roseQuestion,
    options: options.map(opt => ({ optionName: opt })),
    selectableOptionsCount: 1
  };

  const response = await sock.sendMessage(cleanPhone, {
    pollCreationMessage
  });

  if (!response) {
    throw new Error("Failed to send poll message via WhatsApp Web");
  }

  const messageId = response.key.id;
  const messageSecret = response.messageContextInfo?.messageSecret;

  if (!messageId || !messageSecret) {
    throw new Error("Could not retrieve message ID or message secret from sent poll");
  }

  const optionsMap: Record<string, string> = {};
  options.forEach(opt => {
    optionsMap[opt] = getSHA256(opt);
  });

  await prisma.whatsappPoll.create({
    data: {
      messageId,
      orderId,
      userId,
      optionsJson: JSON.stringify(optionsMap),
      messageSecret: Buffer.from(messageSecret).toString("base64")
    }
  });

  console.log(`[Baileys Manager] Poll sent successfully. Saved to database. Message ID: ${messageId}`);
  return response;
};

export const sendBaileysTextMessage = async (
  userId: string,
  phone: string,
  bodyText: string
) => {
  await loadBaileys();
  const sock = activeConnections.get(userId);
  if (!sock) {
    throw new Error("WhatsApp Web is not connected for this user");
  }

  let cleanPhone = phone.replace(/\D/g, "");
  if (!cleanPhone.endsWith("@s.whatsapp.net")) {
    cleanPhone = `${cleanPhone}@s.whatsapp.net`;
  }

  console.log(`[Baileys Manager] Sending text message to ${cleanPhone}`);
  const response = await sock.sendMessage(cleanPhone, { text: bodyText });
  return response;
};

export const initializeAllSessions = async () => {
  await loadBaileys();
  try {
    console.log("[Baileys Manager] Restoring active sessions...");
    const sessions = await prisma.whatsappSession.findMany({
      where: { connected: true }
    });

    console.log(`[Baileys Manager] Found ${sessions.length} sessions to restore.`);
    for (const session of sessions) {
      connectUser(session.userId).catch((err) => {
        console.error(`[Baileys Manager] Failed to restore session for user ${session.userId}:`, err);
      });
    }
  } catch (err) {
    console.error("[Baileys Manager] Error during sessions restoration:", err);
  }
};
