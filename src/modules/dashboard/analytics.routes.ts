import { Router, Response } from "express";
import { getAnalyticsOverview, getTopProducts, getCustomerAnalytics } from "./analytics.service";
import { authMiddleware, AuthenticatedRequest } from "../auth/auth.middleware";

const router = Router();
router.use(authMiddleware as any);

router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const data = await getAnalyticsOverview(userId);
    res.json(data);
  } catch (error) {
    console.error(`[Analytics] Failed to fetch analytics overview:`, error);
    res.status(500).json({ error: "Failed to fetch analytics overview" });
  }
});

router.get("/products", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const data = await getTopProducts(userId);
    res.json(data);
  } catch (error) {
    console.error(`[Analytics] Failed to fetch top products:`, error);
    res.status(500).json({ error: "Failed to fetch top products" });
  }
});

router.get("/customers", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const data = await getCustomerAnalytics(userId);
    res.json(data);
  } catch (error) {
    console.error(`[Analytics] Failed to fetch customer analytics:`, error);
    res.status(500).json({ error: "Failed to fetch customer analytics" });
  }
});

export default router;
