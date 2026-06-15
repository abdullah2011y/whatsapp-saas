import { Router, Response } from "express";
import { AuthenticatedRequest, authMiddleware } from "../auth/auth.middleware";
import prisma from "../../config/database";
import bcrypt from "bcryptjs";
import { logAction } from "../../shared/services/audit.service";
import jwt from "jsonwebtoken";
import { redisConnection } from "../../config/redis";
import fs from "fs";
import path from "path";

const router = Router();

// Helper: Ensure requested user is a Super Admin
async function adminOnlyMiddleware(req: AuthenticatedRequest, res: Response, next: any) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: "Unauthorized: Please log in." });
  }
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true }
    });
    
    if (!user || user.role !== "SUPERADMIN") {
      return res.status(403).json({ error: "Forbidden: Access restricted to Super Admin only." });
    }
    next();
  } catch (err) {
    console.error("[Admin Auth Middleware] Error:", err);
    res.status(500).json({ error: "Internal server validation error" });
  }
}

// Apply auth & admin validation to all admin endpoints
router.use(authMiddleware, adminOnlyMiddleware);

// GET /admin/stats - Global Dashboard Stats
router.get("/stats", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date();

    // Users Stats
    const totalUsers = await prisma.user.count({
      where: { role: { not: "SUPERADMIN" } }
    });

    const activeUsers = await prisma.user.count({
      where: {
        role: { not: "SUPERADMIN" },
        status: "ACTIVE",
        OR: [
          { plan: "Lifetime" },
          { expiresAt: { gt: now } }
        ]
      }
    });

    const expiredUsers = await prisma.user.count({
      where: {
        role: { not: "SUPERADMIN" },
        plan: { not: "Lifetime" },
        status: { not: "SUSPENDED" }, // Suspended/Archived are separate statuses
        OR: [
          { expiresAt: null },
          { expiresAt: { lte: now } }
        ]
      }
    });

    // Orders Stats
    const totalOrders = await prisma.order.count();
    const confirmedOrders = await prisma.order.count({ where: { status: "CONFIRMED" } });
    const cancelledOrders = await prisma.order.count({ where: { status: "CANCELLED" } });

    // WhatsApp Connected Sessions
    const whatsappConnected = await prisma.user.count({
      where: {
        role: { not: "SUPERADMIN" },
        OR: [
          { whatsappSession: { connected: true } },
          { settings: { isConnected: true } }
        ]
      }
    });

    // Shopify Connected Users
    const shopifyConnected = await prisma.user.count({
      where: {
        role: { not: "SUPERADMIN" },
        settings: {
          shopifyDomain: { not: null },
          shopifyStoreDetected: true
        }
      }
    });

    // Revenue computations
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyOrders = await prisma.order.aggregate({
      _sum: { amount: true },
      where: {
        status: "CONFIRMED",
        createdAt: { gte: startOfMonth }
      }
    });
    const monthlyRevenue = monthlyOrders._sum.amount || 0;

    const totalOrdersAgg = await prisma.order.aggregate({
      _sum: { amount: true },
      where: {
        status: "CONFIRMED"
      }
    });
    const totalRevenue = totalOrdersAgg._sum.amount || 0;

    // --- Enterprise SaaS Metrics ---
    const allUsers = await prisma.user.findMany({
      where: { role: { not: "SUPERADMIN" } },
      include: { planRef: true }
    });

    let mrr = 0;
    let activeSubscribers = 0;
    let lifetimeCustomers = 0;
    let expiringSubscriptions = 0;
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Grouping count/revenue by plan
    const planDistribution: { [key: string]: { count: number; mrr: number } } = {};

    for (const u of allUsers) {
      const isActive = u.status === "ACTIVE" && (u.plan === "Lifetime" || (u.expiresAt && u.expiresAt > now));
      const planName = u.plan || "Free";

      if (!planDistribution[planName]) {
        planDistribution[planName] = { count: 0, mrr: 0 };
      }
      planDistribution[planName].count++;

      if (isActive) {
        activeSubscribers++;
        let planPrice = 0;
        if (u.planRef) {
          planPrice = u.planRef.priceMonthly;
        } else {
          // Fallback plan prices if planRef is null
          if (planName === "Starter") planPrice = 19;
          else if (planName === "Growth") planPrice = 49;
          else if (planName === "Business") planPrice = 99;
          else if (planName === "Enterprise") planPrice = 299;
          else if (planName === "Lifetime") planPrice = 0; // lifetime counted separately
        }

        if (planName === "Lifetime") {
          lifetimeCustomers++;
        } else {
          mrr += planPrice;
          planDistribution[planName].mrr += planPrice;
        }

        // Check if expiring in next 7 days
        if (u.expiresAt && u.expiresAt > now && u.expiresAt <= nextWeek) {
          expiringSubscriptions++;
        }
      }
    }

    const arr = mrr * 12;
    const churnRate = totalUsers > 0 ? Number(((expiredUsers / totalUsers) * 100).toFixed(1)) : 0;

    // Six Months Revenue History
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const ordersHistory = await prisma.order.findMany({
      where: {
        status: "CONFIRMED",
        createdAt: { gte: sixMonthsAgo }
      },
      select: {
        amount: true,
        createdAt: true
      }
    });

    const revenueByMonthMap: { [key: string]: number } = {};
    for (const o of ordersHistory) {
      const monthKey = o.createdAt.toISOString().substring(0, 7); // YYYY-MM
      revenueByMonthMap[monthKey] = (revenueByMonthMap[monthKey] || 0) + o.amount;
    }

    // Convert to sorted array for charts
    const revenueByMonth = Object.keys(revenueByMonthMap)
      .sort()
      .map(month => ({
        month,
        revenue: Number(revenueByMonthMap[month].toFixed(2))
      }));

    res.json({
      totalUsers,
      activeUsers,
      expiredUsers,
      totalOrders,
      confirmedOrders,
      cancelledOrders,
      whatsappConnected,
      shopifyConnected,
      monthlyRevenue,
      totalRevenue,
      // SaaS upgrades
      mrr,
      arr,
      activeSubscribers,
      expiringSubscriptions,
      churnRate,
      lifetimeCustomers,
      planDistribution,
      revenueByMonth
    });
  } catch (error: any) {
    console.error("[Admin API] Failed to fetch stats:", error);
    res.status(500).json({ error: "Failed to load global admin statistics." });
  }
});

// GET /admin/users - User Management List
router.get("/users", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: { not: "SUPERADMIN" } },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        createdAt: true,
        plan: true,
        licenseKey: true,
        expiresAt: true,
        status: true
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(users);
  } catch (error) {
    console.error("[Admin API] Failed to fetch users:", error);
    res.status(500).json({ error: "Failed to load registered users." });
  }
});

// POST /admin/users/:id/status - Suspend/Activate User
router.post("/users/:id/status", async (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id as string;
  const { status } = req.body; // ACTIVE, SUSPENDED

  if (!["ACTIVE", "SUSPENDED"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value. Must be ACTIVE or SUSPENDED." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: "User not found." });
    if (user.role === "SUPERADMIN") {
      return res.status(400).json({ error: "Cannot modify status of Super Admin." });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { status }
    });

    await logAction(
      req.user!.id,
      status === "SUSPENDED" ? "SUSPEND_USER" : "ACTIVATE_USER",
      id,
      `Changed user ${user.email} status to ${status}`
    );

    res.json({ message: `User status changed to ${status}`, user: updated });
  } catch (error) {
    console.error("[Admin API] User status error:", error);
    res.status(500).json({ error: "Failed to update user status." });
  }
});

// POST /admin/users/:id/restore - Restore Archived or Suspended User
router.post("/users/:id/restore", async (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id as string;

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: "User not found." });

    // Check if user is expired or expired for > 30 days
    // Restore them to ACTIVE status, and give them a 30-day subscription extension as grace/restore
    const newExpires = new Date();
    newExpires.setDate(newExpires.getDate() + 30);

    const updated = await prisma.user.update({
      where: { id },
      data: {
        status: "ACTIVE",
        expiresAt: newExpires,
        plan: "Grace Period" // reset to grace period if they had none
      }
    });

    await logAction(
      req.user!.id,
      "RESTORE_USER",
      id,
      `Restored user ${user.email} from ${user.status} to ACTIVE. Extended subscription by 30 days (expires: ${newExpires})`
    );

    res.json({ message: "User account restored successfully with 30-day grace period.", user: updated });
  } catch (error) {
    console.error("[Admin API] Restore user error:", error);
    res.status(500).json({ error: "Failed to restore user account." });
  }
});

// POST /admin/users/:id/reset-password - Reset Password
router.post("/users/:id/reset-password", async (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id as string;
  const { password } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: "User not found." });

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    });

    await logAction(
      req.user!.id,
      "RESET_USER_PASSWORD",
      id,
      `Reset password for user ${user.email}`
    );

    res.json({ message: "Password reset completed successfully." });
  } catch (error) {
    console.error("[Admin API] Reset password error:", error);
    res.status(500).json({ error: "Failed to reset password." });
  }
});

// POST /admin/users/:id/extend - Extend subscription
router.post("/users/:id/extend", async (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id as string;
  const { days } = req.body;

  if (!days || isNaN(days) || Number(days) <= 0) {
    return res.status(400).json({ error: "Must provide a valid number of days to extend." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: "User not found." });

    // Calculate extension
    let currentExpiry = user.expiresAt ? new Date(user.expiresAt) : new Date();
    if (currentExpiry < new Date()) {
      currentExpiry = new Date();
    }
    currentExpiry.setDate(currentExpiry.getDate() + Number(days));

    const updated = await prisma.user.update({
      where: { id },
      data: {
        expiresAt: currentExpiry,
        status: "ACTIVE" // make active if they were expired/archived
      }
    });

    await logAction(
      req.user!.id,
      "EXTEND_USER_SUBSCRIPTION",
      id,
      `Extended subscription for ${user.email} by ${days} days. New expiry: ${currentExpiry}`
    );

    res.json({ message: `Subscription extended by ${days} days.`, expiresAt: currentExpiry });
  } catch (error) {
    console.error("[Admin API] Extend subscription error:", error);
    res.status(500).json({ error: "Failed to extend subscription." });
  }
});

// DELETE /admin/users/:id - Delete User
router.delete("/users/:id", async (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id as string;

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: "User not found." });
    if (user.role === "SUPERADMIN") {
      return res.status(400).json({ error: "Cannot delete Super Admin." });
    }

    await prisma.user.delete({ where: { id } });

    await logAction(
      req.user!.id,
      "DELETE_USER",
      id,
      `Deleted user account: ${user.name} (${user.email})`
    );

    res.json({ message: "User deleted successfully." });
  } catch (error) {
    console.error("[Admin API] Delete user error:", error);
    res.status(500).json({ error: "Failed to delete user." });
  }
});

// GET /admin/licenses - List all generated license keys
router.get("/licenses", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const licenses = await prisma.licenseKey.findMany({
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(licenses);
  } catch (error) {
    console.error("[Admin API] Failed to fetch license keys:", error);
    res.status(500).json({ error: "Failed to load licenses." });
  }
});

// POST /admin/licenses/generate - Generate license key
router.post("/licenses/generate", async (req: AuthenticatedRequest, res: Response) => {
  const { duration } = req.body; // 1 Month, 3 Months, 6 Months, 12 Months, Lifetime

  const validDurations = ["1 Month", "3 Months", "6 Months", "12 Months", "Lifetime"];
  if (!validDurations.includes(duration)) {
    return res.status(400).json({ error: "Invalid duration. Valid: 1/3/6/12 Months, Lifetime." });
  }

  // Key generator helper: BF-XXXX-XXXX-XXXX
  function generateKeyString(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    return `BF-${segment()}-${segment()}-${segment()}`;
  }

  try {
    let key = "";
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      key = generateKeyString();
      const existing = await prisma.licenseKey.findUnique({ where: { key } });
      if (!existing) isUnique = true;
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({ error: "Failed to generate unique license key." });
    }

    const license = await prisma.licenseKey.create({
      data: {
        key,
        duration,
        status: "UNUSED"
      }
    });

    await logAction(
      req.user!.id,
      "GENERATE_LICENSE_KEY",
      license.id,
      `Generated new ${duration} license key: ${key}`
    );

    res.json(license);
  } catch (error) {
    console.error("[Admin API] Key generation error:", error);
    res.status(500).json({ error: "Failed to generate license key." });
  }
});

// POST /admin/licenses/toggle - Activate/Deactivate a license key
router.post("/licenses/toggle", async (req: AuthenticatedRequest, res: Response) => {
  const { keyId, status } = req.body; // ACTIVE, DEACTIVATED

  if (!["ACTIVE", "DEACTIVATED"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value." });
  }

  try {
    const license = await prisma.licenseKey.findUnique({ where: { id: keyId } });
    if (!license) return res.status(404).json({ error: "License key not found." });

    const originalStatus = license.status;

    // Toggle key status
    const updatedLicense = await prisma.licenseKey.update({
      where: { id: keyId },
      data: { status }
    });

    // If key is assigned, update user as well
    if (license.userId) {
      if (status === "DEACTIVATED") {
        // Lock user features immediately
        await prisma.user.update({
          where: { id: license.userId },
          data: {
            expiresAt: new Date(Date.now() - 1000), // set to past
            plan: "Free",
            licenseKey: null
          }
        });
      } else if (status === "ACTIVE" && originalStatus === "DEACTIVATED") {
        // Restore user access
        await prisma.user.update({
          where: { id: license.userId },
          data: {
            expiresAt: license.expiresAt, // use computed license expiry
            plan: license.duration,
            licenseKey: license.key,
            status: "ACTIVE"
          }
        });
      }
    }

    await logAction(
      req.user!.id,
      status === "DEACTIVATED" ? "DEACTIVATE_LICENSE" : "ACTIVATE_LICENSE",
      keyId,
      `Toggled license key ${license.key} to ${status}`
    );

    res.json(updatedLicense);
  } catch (error) {
    console.error("[Admin API] Toggle license error:", error);
    res.status(500).json({ error: "Failed to update license key status." });
  }
});

// POST /admin/licenses/assign - Assign License to a User
router.post("/licenses/assign", async (req: AuthenticatedRequest, res: Response) => {
  const { keyId, userId } = req.body;

  try {
    const license = await prisma.licenseKey.findUnique({ where: { id: keyId } });
    if (!license) return res.status(404).json({ error: "License key not found." });
    if (license.status === "ACTIVE" && license.userId) {
      return res.status(400).json({ error: "License key is already assigned to a user." });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found." });

    // Compute expiry date
    const now = new Date();
    let expiresAt: Date | null = new Date();

    switch (license.duration) {
      case "1 Month":
        expiresAt.setDate(now.getDate() + 30);
        break;
      case "3 Months":
        expiresAt.setDate(now.getDate() + 90);
        break;
      case "6 Months":
        expiresAt.setDate(now.getDate() + 180);
        break;
      case "12 Months":
        expiresAt.setDate(now.getDate() + 365);
        break;
      case "Lifetime":
        expiresAt = new Date("2099-12-31T23:59:59Z");
        break;
      default:
        return res.status(400).json({ error: "Unsupported license duration." });
    }

    // Update license key record
    const updatedLicense = await prisma.licenseKey.update({
      where: { id: keyId },
      data: {
        userId,
        status: "ACTIVE",
        activatedAt: now,
        expiresAt
      }
    });

    // Update user record
    await prisma.user.update({
      where: { id: userId },
      data: {
        plan: license.duration,
        licenseKey: license.key,
        expiresAt,
        status: "ACTIVE" // Restores user to ACTIVE status
      }
    });

    await logAction(
      req.user!.id,
      "ASSIGN_LICENSE_KEY",
      keyId,
      `Assigned license ${license.key} (${license.duration}) to user ${user.email}`
    );

    res.json(updatedLicense);
  } catch (error) {
    console.error("[Admin API] Assign license error:", error);
    res.status(500).json({ error: "Failed to assign license key." });
  }
});

// GET /admin/logs - Fetch audit logs
router.get("/logs", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 200
    });
    res.json(logs);
  } catch (error) {
    console.error("[Admin API] Fetch audit logs error:", error);
    res.status(500).json({ error: "Failed to retrieve system logs." });
  }
});

// POST /admin/subscriptions/check - Manually trigger subscription check
import { runSubscriptionMonitorCheck } from "./subscription-monitor.service";
router.post("/subscriptions/check", async (req: AuthenticatedRequest, res: Response) => {
  try {
    await runSubscriptionMonitorCheck();
    await logAction(req.user!.id, "FORCE_RUN_SUBSCRIPTION_MONITOR", null, "Super Admin manually triggered subscription monitoring check");
    res.json({ message: "Subscription monitor check finished successfully" });
  } catch (error: any) {
    console.error("[Admin API] Force run subscription monitor error:", error);
    res.status(500).json({ error: error.message || "Failed to trigger subscription check" });
  }
});

// ==========================================
// SAAS PLAN CRUD
// ==========================================

// GET /admin/plans
router.get("/plans", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const plans = await prisma.saaSPlan.findMany({
      orderBy: { priceMonthly: "asc" }
    });
    res.json(plans);
  } catch (error) {
    console.error("[Admin API] Failed to fetch plans:", error);
    res.status(500).json({ error: "Failed to load SaaS plans." });
  }
});

// POST /admin/plans
router.post("/plans", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, priceMonthly, priceYearly, durationDays, maxOrders, maxMessages, maxTemplates, maxAutomations, maxSessions, features } = req.body;
    if (!name) return res.status(400).json({ error: "Plan name is required." });

    const plan = await prisma.saaSPlan.create({
      data: {
        name,
        priceMonthly: Number(priceMonthly) || 0,
        priceYearly: Number(priceYearly) || 0,
        durationDays: Number(durationDays) || 30,
        maxOrders: Number(maxOrders) || 100,
        maxMessages: Number(maxMessages) || 100,
        maxTemplates: Number(maxTemplates) || 10,
        maxAutomations: Number(maxAutomations) || 5,
        maxSessions: Number(maxSessions) || 1,
        features: Array.isArray(features) ? JSON.stringify(features) : "[]"
      }
    });

    await logAction(req.user!.id, "CREATE_SAAS_PLAN", plan.id, `Created plan ${name}`);
    res.json(plan);
  } catch (error) {
    console.error("[Admin API] Create plan error:", error);
    res.status(500).json({ error: "Failed to create SaaS plan." });
  }
});

// PUT /admin/plans/:id
router.put("/plans/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, priceMonthly, priceYearly, durationDays, maxOrders, maxMessages, maxTemplates, maxAutomations, maxSessions, features } = req.body;

    const plan = await prisma.saaSPlan.update({
      where: { id },
      data: {
        name,
        priceMonthly: priceMonthly !== undefined ? Number(priceMonthly) : undefined,
        priceYearly: priceYearly !== undefined ? Number(priceYearly) : undefined,
        durationDays: durationDays !== undefined ? Number(durationDays) : undefined,
        maxOrders: maxOrders !== undefined ? Number(maxOrders) : undefined,
        maxMessages: maxMessages !== undefined ? Number(maxMessages) : undefined,
        maxTemplates: maxTemplates !== undefined ? Number(maxTemplates) : undefined,
        maxAutomations: maxAutomations !== undefined ? Number(maxAutomations) : undefined,
        maxSessions: maxSessions !== undefined ? Number(maxSessions) : undefined,
        features: Array.isArray(features) ? JSON.stringify(features) : undefined
      }
    });

    await logAction(req.user!.id, "UPDATE_SAAS_PLAN", plan.id, `Updated plan ${name || plan.name}`);
    res.json(plan);
  } catch (error) {
    console.error("[Admin API] Update plan error:", error);
    res.status(500).json({ error: "Failed to update SaaS plan." });
  }
});

// DELETE /admin/plans/:id
router.delete("/plans/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const plan = await prisma.saaSPlan.delete({
      where: { id }
    });

    await logAction(req.user!.id, "DELETE_SAAS_PLAN", id, `Deleted plan ${plan.name}`);
    res.json({ success: true });
  } catch (error) {
    console.error("[Admin API] Delete plan error:", error);
    res.status(500).json({ error: "Failed to delete SaaS plan." });
  }
});

// ==========================================
// BULK LICENSE KEY GENERATION
// ==========================================

// POST /admin/licenses/bulk-generate
router.post("/licenses/bulk-generate", async (req: AuthenticatedRequest, res: Response) => {
  const { duration, count } = req.body;
  const validDurations = ["1 Month", "3 Months", "6 Months", "12 Months", "Lifetime"];
  if (!validDurations.includes(duration)) {
    return res.status(400).json({ error: "Invalid duration." });
  }

  const numCount = Math.min(Number(count) || 1, 100); // Max 100 keys at once

  function generateKeyString(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    return `BF-${segment()}-${segment()}-${segment()}`;
  }

  try {
    const keysGenerated: string[] = [];
    for (let i = 0; i < numCount; i++) {
      let key = "";
      let isUnique = false;
      let attempts = 0;

      while (!isUnique && attempts < 10) {
        key = generateKeyString();
        const existing = await prisma.licenseKey.findUnique({ where: { key } });
        if (!existing && !keysGenerated.includes(key)) isUnique = true;
        attempts++;
      }

      if (isUnique) {
        keysGenerated.push(key);
      }
    }

    const createdLicenses = await prisma.$transaction(
      keysGenerated.map(key => prisma.licenseKey.create({
        data: {
          key,
          duration,
          status: "UNUSED"
        }
      }))
    );

    await logAction(
      req.user!.id,
      "BULK_GENERATE_LICENSE_KEYS",
      null,
      `Generated ${createdLicenses.length} keys for duration ${duration}`
    );

    res.json(createdLicenses);
  } catch (error) {
    console.error("[Admin API] Bulk license key generation error:", error);
    res.status(500).json({ error: "Failed to bulk generate license keys." });
  }
});

// ==========================================
// IMPERSONATION
// ==========================================

// POST /admin/impersonate/:userId
router.post("/impersonate/:userId", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = req.params.userId as string;
    const adminUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });

    if (!adminUser || adminUser.role !== "SUPERADMIN") {
      return res.status(403).json({ error: "Forbidden: Super Admin only." });
    }

    if (!targetUser) {
      return res.status(404).json({ error: "Target user not found." });
    }

    if (targetUser.role === "SUPERADMIN") {
      return res.status(400).json({ error: "Cannot impersonate another Super Admin." });
    }

    const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";
    const payload = {
      userId: targetUser.id,
      email: targetUser.email,
      role: targetUser.role,
      status: targetUser.status,
      impersonatorId: adminUser.id // store impersonator id in payload
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "2h" }); // short-lived impersonation token

    await logAction(
      adminUser.id,
      "IMPERSONATE_USER",
      targetUser.id,
      `Super Admin ${adminUser.email} impersonated user ${targetUser.email}`
    );

    res.json({
      message: `Impersonation successful. Logging in as ${targetUser.name}`,
      token,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        status: targetUser.status,
        plan: targetUser.plan,
        licenseKey: targetUser.licenseKey,
        expiresAt: targetUser.expiresAt
      }
    });
  } catch (error) {
    console.error("[Admin API] Impersonation error:", error);
    res.status(500).json({ error: "Failed to perform user impersonation." });
  }
});

// ==========================================
// HEALTH MONITOR & SYSTEM DIAGNOSTICS
// ==========================================

// GET /admin/health
router.get("/health", async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 1. Check Database Health
    let dbStatus = "Red";
    let dbDetails = "Unavailable";
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = "Green";
      dbDetails = "Connected";
    } catch (dbErr: any) {
      dbDetails = dbErr.message || "Failed SELECT 1 query";
    }

    // 2. Check Redis Health
    let redisStatus = "Red";
    let redisDetails = "Disconnected";
    try {
      if (redisConnection && redisConnection.status === "ready") {
        redisStatus = "Green";
        redisDetails = "Connected";
      } else {
        await redisConnection.ping();
        redisStatus = "Green";
        redisDetails = "Connected";
      }
    } catch (redisErr: any) {
      redisDetails = redisErr.message || "Ping failed";
    }

    // 3. Check WhatsApp Connected Sessions
    const totalSessions = await prisma.whatsappSession.count();
    const activeSessions = await prisma.whatsappSession.count({ where: { connected: true } });
    const whatsappStatus = activeSessions > 0 ? "Green" : (totalSessions > 0 ? "Yellow" : "Green");
    const whatsappDetails = `${activeSessions}/${totalSessions} connected sessions`;

    // 4. Check Shopify Webhooks Health
    const activeWebhooksCount = await prisma.settings.count({ where: { shopifyWebhookStatus: "ACTIVE" } });
    const healthyShopifyCount = await prisma.settings.count({ where: { shopifyConnectionHealth: "HEALTHY" } });
    const shopifyStatus = healthyShopifyCount > 0 ? "Green" : (activeWebhooksCount > 0 ? "Yellow" : "Green");
    const shopifyDetails = `${healthyShopifyCount} healthy shopify connections, ${activeWebhooksCount} active webhooks`;

    // Overall Status
    let overallStatus = "Green";
    if (dbStatus === "Red" || redisStatus === "Red") {
      overallStatus = "Red";
    } else if (whatsappStatus === "Yellow" || shopifyStatus === "Yellow") {
      overallStatus = "Yellow";
    }

    res.json({
      status: overallStatus,
      timestamp: new Date(),
      services: {
        database: { status: dbStatus, details: dbDetails },
        redis: { status: redisStatus, details: redisDetails },
        whatsapp: { status: whatsappStatus, details: whatsappDetails },
        shopify: { status: shopifyStatus, details: shopifyDetails }
      }
    });
  } catch (error: any) {
    console.error("[Admin API] Health check error:", error);
    res.status(500).json({ error: "Failed to perform system health checks." });
  }
});

// ==========================================
// SYSTEM DISASTER RECOVERY & CONFIGS
// ==========================================

// GET /admin/system-config
router.get("/system-config", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const configs = await prisma.systemConfig.findMany();
    const result: { [key: string]: string } = {
      MAINTENANCE_MODE: "false",
      READ_ONLY_MODE: "false",
      EMERGENCY_SHUTDOWN: "false"
    };
    for (const c of configs) {
      result[c.key] = c.value;
    }
    res.json(result);
  } catch (error) {
    console.error("[Admin API] Failed to fetch system configs:", error);
    res.status(500).json({ error: "Failed to fetch system configurations." });
  }
});

// POST /admin/system-config
router.post("/system-config", async (req: AuthenticatedRequest, res: Response) => {
  const { key, value } = req.body;
  if (!key || value === undefined) {
    return res.status(400).json({ error: "Key and value are required." });
  }

  const allowedKeys = ["MAINTENANCE_MODE", "READ_ONLY_MODE", "EMERGENCY_SHUTDOWN"];
  if (!allowedKeys.includes(key)) {
    return res.status(400).json({ error: "Invalid configuration key." });
  }

  try {
    const config = await prisma.systemConfig.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) }
    });

    await logAction(
      req.user!.id,
      "UPDATE_SYSTEM_CONFIG",
      key,
      `Toggled system config ${key} to ${value}`
    );

    res.json(config);
  } catch (error) {
    console.error("[Admin API] Failed to update system config:", error);
    res.status(500).json({ error: "Failed to save system configuration." });
  }
});

// ==========================================
// BACKUP & RESTORE SYSTEM (PORTABLE JSON SNAPSHOT)
// ==========================================

const BACKUPS_DIR = path.join(process.cwd(), "backups");

// Helper: Ensure backups directory exists
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

// GET /admin/backups
router.get("/backups", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const backups = await prisma.backup.findMany({
      orderBy: { createdAt: "desc" }
    });
    res.json(backups);
  } catch (error) {
    console.error("[Admin API] Failed to fetch backups list:", error);
    res.status(500).json({ error: "Failed to load backups list." });
  }
});

// POST /admin/backups (Create Backup)
router.post("/backups", async (req: AuthenticatedRequest, res: Response) => {
  const filename = `backup_${Date.now()}.json`;
  const filePath = path.join(BACKUPS_DIR, filename);

  try {
    // Collect all data
    const dataSnapshot: { [key: string]: any[] } = {};
    
    const TABLES_TO_BACKUP = [
      "saaSPlan",
      "user",
      "settings",
      "whatsappSession",
      "order",
      "template",
      "automation",
      "whatsappPoll",
      "licenseKey",
      "auditLog",
      "notification",
      "loginHistory",
      "systemConfig"
    ];

    for (const t of TABLES_TO_BACKUP) {
      dataSnapshot[t] = await (prisma[t as any] as any).findMany();
    }

    const backupJson = JSON.stringify(dataSnapshot, null, 2);
    fs.writeFileSync(filePath, backupJson, "utf8");
    const sizeBytes = fs.statSync(filePath).size;

    const backupRecord = await prisma.backup.create({
      data: {
        filename,
        sizeBytes,
        status: "COMPLETED",
        createdById: req.user!.id
      }
    });

    await logAction(
      req.user!.id,
      "CREATE_DATABASE_BACKUP",
      backupRecord.id,
      `Created database backup ${filename} (${(sizeBytes / 1024).toFixed(1)} KB)`
    );

    res.json(backupRecord);
  } catch (error: any) {
    console.error("[Admin API] Create database backup error:", error);
    
    // Create a failed record in DB
    try {
      await prisma.backup.create({
        data: {
          filename,
          sizeBytes: 0,
          status: "FAILED",
          createdById: req.user!.id
        }
      });
    } catch (e) {
      console.error("[Admin API] Failed to log failed backup:", e);
    }

    res.status(500).json({ error: "Database backup failed: " + error.message });
  }
});

// GET /admin/backups/:id/download (Download Backup File)
router.get("/backups/:id/download", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const backup = await prisma.backup.findUnique({
      where: { id: req.params.id as string }
    });

    if (!backup) {
      return res.status(404).json({ error: "Backup record not found." });
    }

    const filePath = path.join(BACKUPS_DIR, backup.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Backup physical file not found on disk." });
    }

    res.download(filePath, backup.filename);
  } catch (error) {
    console.error("[Admin API] Download backup error:", error);
    res.status(500).json({ error: "Failed to download backup." });
  }
});

// POST /admin/backups/:id/restore (Restore Backup Snapshot)
router.post("/backups/:id/restore", async (req: AuthenticatedRequest, res: Response) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: "Super Admin password is required to restore." });
  }

  try {
    // Verify admin password
    const adminUser = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    if (!adminUser) return res.status(401).json({ error: "Admin account not found" });

    const matches = await bcrypt.compare(password, adminUser.password);
    if (!matches) {
      return res.status(401).json({ error: "Unauthorized: Invalid password confirmation." });
    }

    const backup = await prisma.backup.findUnique({
      where: { id: req.params.id as string }
    });

    if (!backup) {
      return res.status(404).json({ error: "Backup record not found." });
    }

    const filePath = path.join(BACKUPS_DIR, backup.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Backup file not found on disk." });
    }

    const snapshot = JSON.parse(fs.readFileSync(filePath, "utf8"));

    // Deletion order (child models first)
    const DELETION_ORDER = [
      "loginHistory",
      "notification",
      "auditLog",
      "whatsappPoll",
      "automation",
      "template",
      "order",
      "whatsappSession",
      "settings",
      "licenseKey",
      "user",
      "saaSPlan",
      "systemConfig"
    ];

    // Restore order (parent models first)
    const RESTORE_ORDER = [
      "systemConfig",
      "saaSPlan",
      "user",
      "licenseKey",
      "settings",
      "whatsappSession",
      "order",
      "template",
      "automation",
      "whatsappPoll",
      "auditLog",
      "notification",
      "loginHistory"
    ];

    // Execute deletion and restoration inside a single safe transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete all records
      for (const t of DELETION_ORDER) {
        await (tx[t as any] as any).deleteMany({});
      }

      // 2. Insert snapshot records
      for (const t of RESTORE_ORDER) {
        const records = snapshot[t] || [];
        for (const record of records) {
          // Convert date fields from strings to Date objects
          const cleanRecord: any = {};
          for (const key of Object.keys(record)) {
            const val = record[key];
            if (
              val &&
              typeof val === "string" &&
              (key.endsWith("At") || key === "lastSync" || key === "lastUsageReset")
            ) {
              cleanRecord[key] = new Date(val);
            } else {
              cleanRecord[key] = val;
            }
          }
          await (tx[t as any] as any).create({ data: cleanRecord });
        }
      }
    });

    await logAction(
      req.user!.id,
      "RESTORE_DATABASE_BACKUP",
      backup.id,
      `Restored database from snapshot: ${backup.filename}`
    );

    res.json({ success: true, message: "Database restored successfully!" });
  } catch (error: any) {
    console.error("[Admin API] Database restore error:", error);
    res.status(500).json({ error: "Database restoration failed: " + error.message });
  }
});

// DELETE /admin/backups/:id (Delete Backup File & Record)
router.delete("/backups/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const backup = await prisma.backup.findUnique({
      where: { id: req.params.id as string }
    });

    if (!backup) {
      return res.status(404).json({ error: "Backup record not found." });
    }

    const filePath = path.join(BACKUPS_DIR, backup.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.backup.delete({
      where: { id: req.params.id as string }
    });

    await logAction(
      req.user!.id,
      "DELETE_DATABASE_BACKUP",
      req.params.id as string,
      `Deleted database backup file ${backup.filename}`
    );

    res.json({ success: true, message: "Backup deleted successfully." });
  } catch (error) {
    console.error("[Admin API] Delete backup error:", error);
    res.status(500).json({ error: "Failed to delete backup." });
  }
});

export default router;
