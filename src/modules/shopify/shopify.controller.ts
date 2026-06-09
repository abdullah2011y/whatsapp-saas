import { Request, Response } from "express";
import { handleShopifyOrderCreate } from "./shopify.service";
import prisma from "../../config/database";
import { AuthenticatedRequest } from "../auth/auth.middleware";
import axios from "axios";

export const webhookHandler = async (req: Request, res: Response) => {
  let userId: string | undefined;
  try {
    console.log("[Shopify Webhook] Shopify order received. Payload ID:", req.body.id);

    const topic = req.headers["x-shopify-topic"];
    const shopDomain = req.headers["x-shopify-shop-domain"] as string | undefined;
    const hmacHeader = req.headers["x-shopify-hmac-sha256"] as string | undefined;

    // Retrieve settings for the user
    userId = req.query.userId as string | undefined;
    let settings = null;

    if (userId) {
      settings = await prisma.settings.findUnique({ where: { userId } });
    } else if (shopDomain) {
      settings = await prisma.settings.findFirst({
        where: { shopifyDomain: shopDomain }
      });
      if (settings) {
        userId = settings.userId;
      }
    }

    if (settings && settings.shopifyWebhookSecret) {
      const crypto = await import("crypto");
      const rawBody = (req as any).rawBody;
      
      if (!rawBody || !hmacHeader) {
        console.error("[Shopify Webhook] Strict verification failed: Raw body or HMAC header is missing.");
        if (userId) {
          await prisma.settings.update({
            where: { userId },
            data: { shopifyConnectionHealth: "UNHEALTHY" }
          });
        }
        return res.status(401).send("Unauthorized: Missing signature or body");
      }

      const hash = crypto
        .createHmac("sha256", settings.shopifyWebhookSecret)
        .update(rawBody)
        .digest("base64");

      if (hash !== hmacHeader) {
        console.error("[Shopify Webhook] STRICT HMAC validation failed. Expected:", hash, "Got:", hmacHeader);
        if (userId) {
          await prisma.settings.update({
            where: { userId },
            data: { shopifyConnectionHealth: "UNHEALTHY" }
          });
        }
        return res.status(401).send("Unauthorized: Invalid Signature");
      }
      console.log("[Shopify Webhook] HMAC signature verified successfully.");
    }

    // Process if it's an order creation webhook or if it has an order ID (for local testing)
    if (topic === "orders/create" || req.body.id) {
      await handleShopifyOrderCreate(req.body, shopDomain || settings?.shopifyDomain || undefined);
      
      // Update connection metrics on successful webhook processing
      if (userId) {
        await prisma.settings.update({
          where: { userId },
          data: {
            shopifyLastWebhookAt: new Date(),
            shopifyConnectionHealth: "HEALTHY",
            shopifyStoreDetected: true
          }
        });
      }
    } else {
      console.log("[Shopify Webhook] Ignored payload (not an order creation or missing ID).");
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("[Shopify Webhook] Error processing webhook:", error);
    if (userId) {
      try {
        await prisma.settings.update({
          where: { userId },
          data: { shopifyConnectionHealth: "UNHEALTHY" }
        });
      } catch (dbErr) {
        console.error("[Shopify Webhook] Failed to update settings error health:", dbErr);
      }
    }
    res.status(500).send("Internal Server Error");
  }
};

export const getShopifySettingsHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const settings = await prisma.settings.findUnique({
      where: { userId }
    });

    res.json({
      shopifyDomain: settings?.shopifyDomain || "",
      shopifyWebhookSecret: settings?.shopifyWebhookSecret || "",
      shopifyWebhookStatus: settings?.shopifyWebhookStatus || "INACTIVE",
      shopifyLastWebhookAt: settings?.shopifyLastWebhookAt || null,
      shopifyConnectionHealth: settings?.shopifyConnectionHealth || "UNKNOWN",
      shopifyStoreDetected: settings?.shopifyStoreDetected || false
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const saveShopifySettingsHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const { shopifyDomain, shopifyWebhookSecret, shopifyWebhookStatus } = req.body;

    const settings = await prisma.settings.upsert({
      where: { userId },
      update: {
        shopifyDomain,
        shopifyWebhookSecret,
        shopifyWebhookStatus: shopifyWebhookStatus || "INACTIVE"
      },
      create: {
        userId,
        shopifyDomain,
        shopifyWebhookSecret,
        shopifyWebhookStatus: shopifyWebhookStatus || "INACTIVE"
      }
    });

    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const generateSecretHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const crypto = await import("crypto");
    const secret = crypto.randomBytes(16).toString("hex");
    res.json({ secret });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const testWebhookHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const settings = await prisma.settings.findUnique({
      where: { userId }
    });

    if (!settings || !settings.shopifyWebhookSecret) {
      return res.status(400).json({ error: "Webhook secret is not configured. Generate and save a secret first." });
    }

    const payload = {
      id: Math.floor(Math.random() * 1000000000),
      total_price: "999.00",
      created_at: new Date().toISOString(),
      order_number: Math.floor(1000 + Math.random() * 9000),
      name: `#TEST-${Math.floor(1000 + Math.random() * 9000)}`,
      customer: {
        first_name: "John",
        last_name: "Doe",
        phone: "+923000000000",
        email: "john.doe@example.com"
      },
      line_items: [
        {
          title: "Premium SaaS Test Product"
        }
      ]
    };

    const crypto = await import("crypto");
    const rawBodyStr = JSON.stringify(payload);
    const hash = crypto
      .createHmac("sha256", settings.shopifyWebhookSecret)
      .update(rawBodyStr)
      .digest("base64");

    // Local webhook URL format
    const localWebhookUrl = `http://localhost:5000/shopify/webhook?userId=${userId}`;

    try {
      const response = await axios.post(localWebhookUrl, rawBodyStr, {
        headers: {
          "Content-Type": "application/json",
          "x-shopify-topic": "orders/create",
          "x-shopify-shop-domain": settings.shopifyDomain || "test-store.myshopify.com",
          "x-shopify-hmac-sha256": hash
        }
      });

      if (response.status === 200) {
        // Update connection status metrics upon successful connection test
        await prisma.settings.update({
          where: { userId },
          data: {
            shopifyLastWebhookAt: new Date(),
            shopifyConnectionHealth: "HEALTHY",
            shopifyStoreDetected: true
          }
        });
        return res.json({ success: true, message: "Webhook test order processed successfully!" });
      } else {
        await prisma.settings.update({
          where: { userId },
          data: { shopifyConnectionHealth: "UNHEALTHY" }
        });
        return res.status(400).json({ error: "Webhook test failed", details: response.data });
      }
    } catch (apiError: any) {
      console.error("Local webhook test failed:", apiError.message);
      await prisma.settings.update({
        where: { userId },
        data: { shopifyConnectionHealth: "UNHEALTHY" }
      });
      return res.status(400).json({ error: "Webhook test failed to connect", details: apiError.message });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
