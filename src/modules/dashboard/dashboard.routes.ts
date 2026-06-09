import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware";
import { getStatsHandler, getAnalyticsHandler, getCustomersHandler } from "./dashboard.controller";

const router = Router();
router.use(authMiddleware as any);

router.get("/stats", getStatsHandler);
router.get("/analytics", getAnalyticsHandler);
router.get("/customers", getCustomersHandler);

export default router;
