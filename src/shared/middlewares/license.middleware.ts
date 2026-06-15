import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../modules/auth/auth.middleware";
import prisma from "../../config/database";

export async function licenseMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized: Missing authentication data" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        role: true,
        status: true,
        plan: true,
        expiresAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 1. Check user status
    if (user.status === "SUSPENDED") {
      return res.status(403).json({ error: "Your account has been suspended. Please contact the administrator." });
    }

    if (user.status === "ARCHIVED" || user.status === "INACTIVE") {
      return res.status(402).json({ error: "Subscription expired. Renew to restore premium features." });
    }

    // 2. Super Admin bypasses licensing restrictions
    if (user.role === "SUPERADMIN") {
      return next();
    }

    // 3. Check subscription / license validity
    if (user.plan === "Lifetime") {
      return next();
    }

    if (!user.expiresAt) {
      return res.status(402).json({ error: "Subscription expired. Renew to restore premium features." });
    }

    const isExpired = new Date(user.expiresAt) < new Date();
    if (isExpired) {
      return res.status(402).json({ error: "Subscription expired. Renew to restore premium features." });
    }

    next();
  } catch (error) {
    console.error("[License Middleware] Error validation:", error);
    res.status(500).json({ error: "Internal Server Error during license verification" });
  }
}
