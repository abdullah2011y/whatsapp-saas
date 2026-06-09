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

// Serialize session directory files to a base64 encoded JSON string
const serializeSession = (userId: string): string | null => {
  const sessionPath = path.join(process.cwd(), "sessions", userId);
  if (!fs.existsSync(sessionPath)) return null;
  const files = fs.readdirSync(sessionPath);
  const data: Record<string, string> = {};
  for (const file of files) {
    const filePath = path.join(sessionPath, file);
    if (fs.statSync(filePath).isFile()) {
      data[file] = fs.readFileSync(filePath, "base64");
    }
  }
  return JSON.stringify(data);
};

// Restore session directory files from base64 JSON string
const deserializeSession = (userId: string, dataStr: string) => {
  const sessionPath = path.join(process.cwd(), "sessions", userId);
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }
  const data = JSON.parse(dataStr) as Record<string, string>;
  for (const [file, content] of Object.entries(data)) {
    fs.writeFileSync(path.join(sessionPath, file), Buffer.from(content, "base64"));
  }
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
  try {
    await prisma.whatsappSession.upsert({
      where: { userId },
      update: { sessionData: null },
      create: { userId, sessionData: null }
    });
  } catch (err) {
    console.error(`[Baileys Manager] Failed to clear session data from DB for user ${userId}:`, err);
  }
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
  
  // Restore session directory from DB if missing locally
  if (!fs.existsSync(sessionPath)) {
    try {
      const dbSession = await prisma.whatsappSession.findUnique({
        where: { userId }
      });
      if (dbSession && dbSession.sessionData) {
        console.log(`[Baileys Manager] Restoring session directory from DB for user ${userId}`);
        deserializeSession(userId, dbSession.sessionData);
      }
    } catch (err) {
      console.error(`[Baileys Manager] Failed to restore session from DB for user ${userId}:`, err);
    }
  }

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

  sock.ev.on("creds.update", async () => {
    await saveCreds();
    try {
      const dataStr = serializeSession(userId);
      if (dataStr) {
        await prisma.whatsappSession.upsert({
          where: { userId },
          update: { sessionData: dataStr },
          create: { userId, sessionData: dataStr }
        });
      }
    } catch (err) {
      console.error(`[Baileys Manager] Failed to backup session to DB for user ${userId}:`, err);
    }
  });

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

export const normalizePhoneNumber = (phone: string): string => {
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("00")) {
    clean = clean.substring(2);
  }
  if (clean.startsWith("9203")) {
    clean = "92" + clean.substring(3);
  } else if (clean.startsWith("03") && clean.length === 11) {
    clean = "92" + clean.substring(1);
  } else if (clean.startsWith("3") && clean.length === 10) {
    clean = "92" + clean;
  }
  return clean;
};

export const getJid = (phone: string): string => {
  const normalized = normalizePhoneNumber(phone);
  return `${normalized}@s.whatsapp.net`;
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

  const normalized = normalizePhoneNumber(phone);
  const jid = getJid(phone);

  console.log(`Original phone: ${phone}`);
  console.log(`Normalized phone: ${normalized}`);
  console.log(`Final JID: ${jid}`);

  let checkResult;
  try {
    checkResult = await sock.onWhatsApp(jid);
  } catch (err: any) {
    console.error(`[Baileys Manager] onWhatsApp check failed:`, err);
  }
  const exists = checkResult && checkResult[0] ? checkResult[0].exists : false;
  console.log(`Recipient exists: ${exists}`);

  if (!exists) {
    console.log(`[Baileys Manager] Stop sending: Recipient JID ${jid} does not exist on WhatsApp.`);
    throw new Error(`Recipient JID ${jid} does not exist on WhatsApp`);
  }

  const pollPayload = {
    poll: {
      name: roseQuestion,
      values: options,
      selectableCount: 0
    }
  };

  let response: any;
  let sentType = "POLL";

  console.log(`[Baileys Manager] Provider used: WhatsApp Web (Baileys)`);
  console.log(`[Baileys Manager] Message type being sent: ${sentType}`);
  console.log(`[Baileys Manager] Final payload shape:`, JSON.stringify(pollPayload, null, 2));

  try {
    response = await sock.sendMessage(jid, pollPayload);
    console.log(`[Baileys Manager] Send success: true`);
    console.log(`[Baileys Manager] Complete response:`, JSON.stringify(response, null, 2));
    if (response) {
      console.log(`Response message key:`, JSON.stringify(response.key));
      console.log(`Response remoteJid:`, response.key?.remoteJid);
      console.log(`Response messageId:`, response.key?.id);
      console.log(`Response status:`, response.status);
    }

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
  } catch (err: any) {
    console.log(`[Baileys Manager] Send success: false`);
    console.warn(`[Baileys Manager] Poll sending failed. Error: ${err.message || err}. Falling back to normal text confirmation message.`);

    sentType = "TEXT_FALLBACK";
    
    // Attempt to load order info for a friendlier text message
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    const fallbackText = order 
      ? `Dear ${order.customer}, please confirm your order of "${order.product}" (Amount: Rs ${order.amount}) by replying with "Confirm" or "Cancel".`
      : `Please confirm your order by replying with "Confirm" or "Cancel".`;

    const textPayload = { text: fallbackText };

    console.log(`[Baileys Manager] Provider used: WhatsApp Web (Baileys)`);
    console.log(`[Baileys Manager] Message type being sent: ${sentType}`);
    console.log(`[Baileys Manager] Final payload shape:`, JSON.stringify(textPayload, null, 2));

    // Double check exists again for fallback safety
    let fallbackCheckResult;
    try {
      fallbackCheckResult = await sock.onWhatsApp(jid);
    } catch (checkErr) {
      console.error(`[Baileys Manager] onWhatsApp check failed for fallback:`, checkErr);
    }
    const fallbackExists = fallbackCheckResult && fallbackCheckResult[0] ? fallbackCheckResult[0].exists : false;
    console.log(`Recipient exists: ${fallbackExists}`);

    if (!fallbackExists) {
      console.log(`[Baileys Manager] Stop sending: Recipient JID ${jid} does not exist on WhatsApp for fallback.`);
      throw new Error(`Recipient JID ${jid} does not exist on WhatsApp for fallback`);
    }

    try {
      response = await sock.sendMessage(jid, textPayload);
      console.log(`[Baileys Manager] Send success: true`);
      console.log(`[Baileys Manager] Complete response:`, JSON.stringify(response, null, 2));
      if (response) {
        console.log(`Response message key:`, JSON.stringify(response.key));
        console.log(`Response remoteJid:`, response.key?.remoteJid);
        console.log(`Response messageId:`, response.key?.id);
        console.log(`Response status:`, response.status);
      }
      return response;
    } catch (textErr: any) {
      console.log(`[Baileys Manager] Send success: false`);
      console.error(`[Baileys Manager] Fallback text message sending failed:`, textErr.message || textErr);
      throw textErr;
    }
  }
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

  const normalized = normalizePhoneNumber(phone);
  const jid = getJid(phone);

  console.log(`Original phone: ${phone}`);
  console.log(`Normalized phone: ${normalized}`);
  console.log(`Final JID: ${jid}`);

  let checkResult;
  try {
    checkResult = await sock.onWhatsApp(jid);
  } catch (err) {
    console.error(`[Baileys Manager] onWhatsApp check failed:`, err);
  }
  const exists = checkResult && checkResult[0] ? checkResult[0].exists : false;
  console.log(`Recipient exists: ${exists}`);

  if (!exists) {
    console.log(`[Baileys Manager] Stop sending: Recipient JID ${jid} does not exist on WhatsApp.`);
    throw new Error(`Recipient JID ${jid} does not exist on WhatsApp`);
  }

  const textPayload = { text: bodyText };
  const sentType = "TEXT";

  console.log(`[Baileys Manager] Provider used: WhatsApp Web (Baileys)`);
  console.log(`[Baileys Manager] Message type being sent: ${sentType}`);
  console.log(`[Baileys Manager] Final payload shape:`, JSON.stringify(textPayload, null, 2));

  try {
    const response = await sock.sendMessage(jid, textPayload);
    console.log(`[Baileys Manager] Send success: true`);
    console.log(`[Baileys Manager] Complete response:`, JSON.stringify(response, null, 2));
    if (response) {
      console.log(`Response message key:`, JSON.stringify(response.key));
      console.log(`Response remoteJid:`, response.key?.remoteJid);
      console.log(`Response messageId:`, response.key?.id);
      console.log(`Response status:`, response.status);
    }
    return response;
  } catch (err: any) {
    console.log(`[Baileys Manager] Send success: false`);
    console.error(`[Baileys Manager] Text message sending failed:`, err.message || err);
    throw err;
  }
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

export const setMockConnection = (userId: string, mockSock: any) => {
  activeConnections.set(userId, mockSock);
};
