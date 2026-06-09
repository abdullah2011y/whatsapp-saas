import { Request, Response } from "express";
import { handleShopifyOrderCreate } from "./shopify.service";
import prisma from "../../config/database";
import { AuthenticatedRequest } from "../auth/auth.middleware";
import axios from "axios";

export const webhookHandler = async (req: Request, res: Response) => {
  try {
    console.log("[Shopify Webhook] Shopify order received. Payload ID:", req.body.id);

    const topic = req.headers["x-shopify-topic"];
    const shopDomain = req.headers["x-shopify-shop-domain"] as string | undefined;
    const hmacHeader = req.headers["x-shopify-hmac-sha256"] as string | undefined;

    // Retrieve settings for the user
    let userId = req.query.userId as string | undefined;
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
      if (!rawBody) {
        console.warn("[Shopify Webhook] Raw body buffer is missing, signature verification skipped.");
      } else {
        const hash = crypto
          .createHmac("sha256", settings.shopifyWebhookSecret)
          .update(rawBody)
          .digest("base64");

        if (hash !== hmacHeader) {
          console.error("[Shopify Webhook] HMAC validation failed. Expected:", hash, "Got:", hmacHeader);
          return res.status(401).send("Unauthorized: Invalid Signature");
        }
        console.log("[Shopify Webhook] HMAC signature verified successfully.");
      }
    }

    // Process if it's an order creation webhook or if it has an order ID (for local testing)
    if (topic === "orders/create" || req.body.id) {
      await handleShopifyOrderCreate(req.body, shopDomain || settings?.shopifyDomain || undefined);
    } else {
      console.log("[Shopify Webhook] Ignored payload (not an order creation or missing ID).");
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("[Shopify Webhook] Error processing webhook:", error);
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
      shopifyWebhookStatus: settings?.shopifyWebhookStatus || "INACTIVE"
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
      const response = await axios.post(localWebhookUrl, payload, {
        headers: {
          "Content-Type": "application/json",
          "x-shopify-topic": "orders/create",
          "x-shopify-shop-domain": settings.shopifyDomain || "test-store.myshopify.com",
          "x-shopify-hmac-sha256": hash
        }
      });

      if (response.status === 200) {
        return res.json({ success: true, message: "Webhook test order processed successfully!" });
      } else {
        return res.status(400).json({ error: "Webhook test failed", details: response.data });
      }
    } catch (apiError: any) {
      console.error("Local webhook test failed:", apiError.message);
      return res.status(400).json({ error: "Webhook test failed to connect", details: apiError.message });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
