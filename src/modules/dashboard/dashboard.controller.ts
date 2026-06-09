import { Response } from "express";
import { AuthenticatedRequest } from "../auth/auth.middleware";
import { getDashboardStats, getAnalyticsData, getCustomers } from "./dashboard.service";

export const getStatsHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const stats = await getDashboardStats(userId);
    res.json(stats);
  } catch (error) {
    console.error(`[Dashboard] Failed to fetch stats:`, error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
};

export const getAnalyticsHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const data = await getAnalyticsData(userId);
    res.json(data);
  } catch (error) {
    console.error(`[Dashboard] Failed to fetch analytics:`, error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
};

export const getCustomersHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const customers = await getCustomers(userId);
    res.json(customers);
  } catch (error) {
    console.error(`[Dashboard] Failed to fetch customers:`, error);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
};
