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

app.get("/", (req, res) => {
  res.send("WhatsApp SaaS Backend Running");
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
// Dashboard routes: /dashboard/stats, /dashboard/analytics, /dashboard/customers