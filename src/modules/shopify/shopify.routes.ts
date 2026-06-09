import { Router } from "express";
import { 
  webhookHandler, 
  getShopifySettingsHandler, 
  saveShopifySettingsHandler, 
  generateSecretHandler, 
  testWebhookHandler 
} from "./shopify.controller";
import { authMiddleware } from "../auth/auth.middleware";

const router = Router();

// Public Shopify webhook endpoint (Shopify sends events here)
router.post("/webhook", webhookHandler);

// Protected tenant configurations
router.use(authMiddleware as any);
router.get("/settings", getShopifySettingsHandler);
router.post("/settings", saveShopifySettingsHandler);
router.post("/webhook/generate-secret", generateSecretHandler);
router.post("/webhook/test", testWebhookHandler);

export default router;
