import "dotenv/config";
import express from "express";
import cors from "cors";
import orderRoutes from "./modules/orders/order.routes";
import { webhookGet, webhookPost } from "./webhook";
import whatsappRoutes from "./modules/whatsapp/whatsapp.routes";
import authRoutes from "./modules/auth/auth.routes";
import shopifyRoutes from "./modules/shopify/shopify.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import customerRoutes from "./modules/customers/customer.routes";
import analyticsRoutes from "./modules/dashboard/analytics.routes";
import activityRoutes from "./modules/dashboard/activity.routes";
import templateRoutes from "./modules/templates/template.routes";
import automationRoutes from "./modules/templates/automation.routes";
import adminRoutes from "./modules/admin/admin.routes";
import notificationRoutes from "./modules/notifications/notification.routes";
import { startSubscriptionScheduler } from "./modules/admin/subscription-monitor.service";

const app = express();

app.use(cors());
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));

// Orders Routes
app.use("/orders", orderRoutes);

// Template Routes

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

// Admin Routes
app.use("/admin", adminRoutes);

// Notifications Routes
app.use("/notifications", notificationRoutes);

// Webhook Routes
app.get("/webhook", webhookGet);
app.post("/webhook", webhookPost);



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
  startSubscriptionScheduler();
});
// Dashboard routes: /dashboard/stats, /dashboard/analytics, /dashboard/customers