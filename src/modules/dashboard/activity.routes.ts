import { Router } from "express";
import prisma from "../../config/database";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 50
    });

    const activities: any[] = [];

    orders.forEach(o => {
      const orderLabel = o.orderName || `#${o.id.substring(0, 4)}`;
      
      // Event 1: New order received
      activities.push({
        id: `new-${o.id}`,
        type: "NEW_ORDER",
        message: `New Shopify order received ${orderLabel} for Rs ${o.amount}`,
        timestamp: o.createdAt,
        orderName: orderLabel,
        customer: o.customer
      });

      // Event 2: Confirmed order
      if (o.status === "CONFIRMED") {
        activities.push({
          id: `confirm-${o.id}`,
          type: "CONFIRMED",
          message: `${orderLabel} confirmed by ${o.customer}`,
          timestamp: o.updatedAt || o.createdAt,
          orderName: orderLabel,
          customer: o.customer
        });
      }

      // Event 3: Cancelled order
      if (o.status === "CANCELLED") {
        activities.push({
          id: `cancel-${o.id}`,
          type: "CANCELLED",
          message: `${orderLabel} cancelled by ${o.customer}`,
          timestamp: o.updatedAt || o.createdAt,
          orderName: orderLabel,
          customer: o.customer
        });
      }
    });

    // Sort by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json(activities.slice(0, 20));
  } catch (error) {
    console.error(`[Activity] Failed to fetch activity feed:`, error);
    res.status(500).json({ error: "Failed to fetch activity feed" });
  }
});

export default router;
