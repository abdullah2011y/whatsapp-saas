import { Router } from "express";
import { getAnalyticsOverview, getTopProducts, getCustomerAnalytics } from "./analytics.service";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const data = await getAnalyticsOverview();
    res.json(data);
  } catch (error) {
    console.error(`[Analytics] Failed to fetch analytics overview:`, error);
    res.status(500).json({ error: "Failed to fetch analytics overview" });
  }
});

router.get("/products", async (req, res) => {
  try {
    const data = await getTopProducts();
    res.json(data);
  } catch (error) {
    console.error(`[Analytics] Failed to fetch top products:`, error);
    res.status(500).json({ error: "Failed to fetch top products" });
  }
});

router.get("/customers", async (req, res) => {
  try {
    const data = await getCustomerAnalytics();
    res.json(data);
  } catch (error) {
    console.error(`[Analytics] Failed to fetch customer analytics:`, error);
    res.status(500).json({ error: "Failed to fetch customer analytics" });
  }
});

export default router;
