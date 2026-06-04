import { Router } from "express";
import { webhookHandler } from "./shopify.controller";

const router = Router();

router.post("/webhook", webhookHandler);

export default router;
