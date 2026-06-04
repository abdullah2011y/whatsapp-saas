import { Request, Response } from "express";
import { getDashboardStats, getAnalyticsData, getCustomers } from "./dashboard.service";

export const getStatsHandler = async (_: Request, res: Response) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error(`[Dashboard] Failed to fetch stats:`, error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
};

export const getAnalyticsHandler = async (_: Request, res: Response) => {
  try {
    const data = await getAnalyticsData();
    res.json(data);
  } catch (error) {
    console.error(`[Dashboard] Failed to fetch analytics:`, error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
};

export const getCustomersHandler = async (_: Request, res: Response) => {
  try {
    const customers = await getCustomers();
    res.json(customers);
  } catch (error) {
    console.error(`[Dashboard] Failed to fetch customers:`, error);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
};
