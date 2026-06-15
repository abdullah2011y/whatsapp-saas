import { Router, Response } from "express";
import { AuthenticatedRequest, authMiddleware } from "../auth/auth.middleware";
import prisma from "../../config/database";
import bcrypt from "bcryptjs";
import { logAction } from "../../shared/services/audit.service";

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
      totalRevenue
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

export default router;
