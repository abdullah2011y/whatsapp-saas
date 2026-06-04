import { Router } from "express";
import { getStatsHandler, getAnalyticsHandler, getCustomersHandler } from "./dashboard.controller";

const router = Router();

router.get("/stats", getStatsHandler);
router.get("/analytics", getAnalyticsHandler);
router.get("/customers", getCustomersHandler);

export default router;
