import "dotenv/config";
import express from "express";
import cors from "cors";
import orderRoutes from "./modules/orders/order.routes";
import { webhookGet, webhookPost } from "./webhook";
import templatesRoutes from "./modules/templates/templates.routes";
import whatsappRoutes from "./modules/whatsapp/whatsapp.routes";
import authRoutes from "./modules/auth/auth.routes";
import shopifyRoutes from "./modules/shopify/shopify.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import customerRoutes from "./modules/customers/customer.routes";
import analyticsRoutes from "./modules/dashboard/analytics.routes";
import activityRoutes from "./modules/dashboard/activity.routes";
import templateRoutes from "./modules/templates/template.routes";
import automationRoutes from "./modules/templates/automation.routes";

const app = express();

app.use(cors());
app.use(express.json());

// Orders Routes
app.use("/orders", orderRoutes);

// Template Routes
app.use("/templates", templatesRoutes);

// WhatsApp Routes
app.use("/whatsapp", whatsappRoutes);

// Auth Routes
app.use("/auth", authRoutes);

// Shopify Routes
app.use("/shopify", shopifyRoutes);

// Dashboard Routes
app.use("/dashboard", dashboardRoutes);

// Customer Routes
app.use("/customers", customerRoutes);

// Analytics Routes
app.use("/analytics", analyticsRoutes);

// Activity Routes
app.use("/activity", activityRoutes);

// Template and Automation Routes
app.use("/templates", templateRoutes);
app.use("/automations", automationRoutes);

// Webhook Routes
app.get("/webhook", webhookGet);
app.post("/webhook", webhookPost);

import prisma from "./config/database";

app.get("/db-debug", async (req, res) => {
  const token = req.query.token;
  if (token !== "byteforge_secure_recovery_2026") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const usersCount = await prisma.user.count();
    const ordersCount = await prisma.order.count();
    const confirmationsCount = await prisma.order.count({
      where: { status: "CONFIRMED" }
    });
    const pendingCount = await prisma.order.count({
      where: { status: "PENDING" }
    });
    const cancelledCount = await prisma.order.count({
      where: { status: "CANCELLED" }
    });

    const orders = await prisma.order.findMany();
    const uniquePhones = new Set(orders.map(o => o.phone).filter(Boolean));
    const customersCount = uniquePhones.size;

    let activitiesCount = orders.length; // NEW_ORDER activity for each
    activitiesCount += orders.filter(o => o.status === "CONFIRMED" || o.status === "CANCELLED").length;

    // Check tables in DB
    const tableQuery: any[] = await prisma.$queryRawUnsafe(`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);
    const tables = tableQuery.map(t => t.table_name);

    // Query columns of Settings and Automation to prove they exist on production
    const settingsColumnsQuery: any[] = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Settings';
    `);
    const automationColumnsQuery: any[] = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Automation';
    `);

    // Check WhatsappSession model and query count
    let whatsappSessionCount = 0;
    let whatsappSessions: any[] = [];
    if (tables.includes("WhatsappSession")) {
      whatsappSessionCount = await prisma.whatsappSession.count();
      whatsappSessions = await prisma.whatsappSession.findMany();
    }

    res.json({
      success: true,
      counts: {
        users: usersCount,
        orders: ordersCount,
        customers: customersCount,
        confirmations: confirmationsCount,
        pending: pendingCount,
        cancelled: cancelledCount,
        activities: activitiesCount,
        whatsappSession: whatsappSessionCount
      },
      tables,
      whatsappSessions,
      columns: {
        settings: settingsColumnsQuery.map(c => ({ name: c.column_name, type: c.data_type })),
        automation: automationColumnsQuery.map(c => ({ name: c.column_name, type: c.data_type }))
      }
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

app.get("/", (req, res) => {
  res.send("WhatsApp SaaS Backend Running");
});


import { initializeDatabase } from "./config/init_db";

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initializeDatabase().catch((err) => {
    console.error("[Startup] Failed to initialize database and sessions:", err);
  });
});
// Dashboard routes: /dashboard/stats, /dashboard/analytics, /dashboard/customers