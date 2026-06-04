import { Request, Response } from "express";
import { handleShopifyOrderCreate } from "./shopify.service";

export const webhookHandler = async (req: Request, res: Response) => {
  try {
    console.log("[Shopify Webhook] Shopify order received. Payload ID:", req.body.id);
    
    const topic = req.headers["x-shopify-topic"];
    console.log(`[Shopify Webhook] Topic: ${topic || 'unknown'}`);

    // Process if it's an order creation webhook or if it has an order ID (for local testing)
    if (topic === "orders/create" || req.body.id) {
      await handleShopifyOrderCreate(req.body);
    } else {
      console.log("[Shopify Webhook] Ignored payload (not an order creation or missing ID).");
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("[Shopify Webhook] Error processing webhook:", error);
    res.status(500).send("Internal Server Error");
  }
};
