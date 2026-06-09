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

import { exec } from "child_process";
import prisma from "./config/database";

app.get("/db-debug", async (req, res) => {
  const token = req.query.token;
  if (token !== "byteforge_secure_recovery_2026") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const action = req.query.action;
  const ownerEmail = req.query.ownerEmail ? String(req.query.ownerEmail).trim().toLowerCase() : undefined;

  const logs: string[] = [];

  try {
    // 1. Run Action if requested
    if (action === "baseline") {
      logs.push("Starting action: baseline");
      await new Promise<void>((resolve, reject) => {
        exec("npx prisma migrate resolve --applied 20260503222112_init", (err, stdout, stderr) => {
          logs.push(`stdout: ${stdout}`);
          if (stderr) logs.push(`stderr: ${stderr}`);
          if (err) {
            logs.push(`error: ${err.message}`);
            return reject(err);
          }
          resolve();
        });
      });
      logs.push("Action baseline completed successfully.");
    } else if (action === "deploy") {
      logs.push("Starting action: deploy");
      await new Promise<void>((resolve, reject) => {
        exec("npx prisma migrate deploy", (err, stdout, stderr) => {
          logs.push(`stdout: ${stdout}`);
          if (stderr) logs.push(`stderr: ${stderr}`);
          if (err) {
            logs.push(`error: ${err.message}`);
            return reject(err);
          }
          resolve();
        });
      });
      logs.push("Action deploy completed successfully.");
    } else if (action === "rollback") {
      logs.push("Starting action: rollback");
      await new Promise<void>((resolve, reject) => {
        exec("npx prisma migrate resolve --rolled-back 20260608131512_add_whatsapp_provider_system", (err, stdout, stderr) => {
          logs.push(`stdout: ${stdout}`);
          if (stderr) logs.push(`stderr: ${stderr}`);
          if (err) {
            logs.push(`error: ${err.message}`);
            return reject(err);
          }
          resolve();
        });
      });
      logs.push("Action rollback completed successfully.");
    } else if (action === "recover") {
      logs.push("Starting action: recover");
      if (!ownerEmail) {
        throw new Error("ownerEmail parameter is required for recovery.");
      }
      const ownerUser = await prisma.user.findFirst({
        where: { email: ownerEmail }
      });
      if (!ownerUser) {
        throw new Error(`Owner user with email ${ownerEmail} not found.`);
      }

      const userId = ownerUser.id;
      logs.push(`Found owner user ID: ${userId} (${ownerUser.name})`);

      // Recovery queries
      const ordersRes = await prisma.order.updateMany({
        where: { userId: null },
        data: { userId }
      });
      logs.push(`Assigned ${ordersRes.count} orders with NULL userId to owner.`);

      const templatesRes = await prisma.template.updateMany({
        where: { userId: null },
        data: { userId }
      });
      logs.push(`Assigned ${templatesRes.count} templates with NULL userId to owner.`);

      const automationsRes = await prisma.automation.updateMany({
        where: { userId: null },
        data: { userId }
      });
      logs.push(`Assigned ${automationsRes.count} automations with NULL userId to owner.`);
      
      logs.push("Action recover completed successfully.");
    }

    // 2. Fetch database info for response
    // Get list of tables
    let tables: string[] = [];
    try {
      const tableQuery: any[] = await prisma.$queryRawUnsafe(`
        SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
      `);
      tables = tableQuery.map(t => t.table_name);
    } catch (err: any) {
      logs.push(`Failed to fetch tables list: ${err.message}`);
    }

    // Migration history
    let migrationsList: any[] = [];
    try {
      migrationsList = await prisma.$queryRawUnsafe(`
        SELECT id, migration_name, finished_at::text as finished_at, logs FROM "_prisma_migrations";
      `);
    } catch (err: any) {
      logs.push(`Failed to fetch migration history: ${err.message}`);
    }

    // Row counts
    const counts: any = {};
    for (const t of tables) {
      try {
        const countRes: any[] = await prisma.$queryRawUnsafe(`
          SELECT COUNT(*)::text as count FROM "${t}";
        `);
        counts[t] = countRes[0]?.count || "0";
      } catch (err: any) {
        counts[t] = `Error: ${err.message}`;
      }
    }

    // Users list
    let users: any[] = [];
    if (tables.includes("User")) {
      try {
        users = await prisma.user.findMany({
          select: { id: true, name: true, email: true, createdAt: true }
        });
      } catch (err: any) {
        logs.push(`Failed to fetch users: ${err.message}`);
      }
    }

    // Orders details (assigned vs unassigned vs wrong user)
    let orderStats: any = {};
    if (tables.includes("Order")) {
      try {
        const total = await prisma.order.count();
        const unassigned = await prisma.order.count({ where: { userId: null } });
        const userGroup = await prisma.order.groupBy({
          by: ["userId"],
          _count: { id: true }
        });
        orderStats = { total, unassigned, userGroup };
      } catch (err: any) {
        logs.push(`Failed to fetch order details: ${err.message}`);
      }
    }

    res.json({
      success: true,
      tables,
      counts,
      users,
      orderStats,
      migrationsList,
      logs
    });

  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
      logs
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