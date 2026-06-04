import express from "express";
import { webhookGet } from "../webhook";

const router = express.Router();

router.get("/webhook", webhookGet);

export default router;