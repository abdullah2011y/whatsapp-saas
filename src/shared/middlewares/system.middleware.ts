import { Response, NextFunction } from "express";
import prisma from "../../config/database";

let configCache: { [key: string]: { value: string; expiresAt: number } } = {};
const CACHE_TTL_MS = 5000; // 5 seconds cache to avoid heavy DB hits on every request

async function getConfigValue(key: string): Promise<string | null> {
  const now = Date.now();
  if (configCache[key] && configCache[key].expiresAt > now) {
    return configCache[key].value;
  }

  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key }
    });
    const val = config ? config.value : "false";
    configCache[key] = {
      value: val,
      expiresAt: now + CACHE_TTL_MS
    };
    return val;
  } catch (err) {
    console.error(`[System Config Middleware] Failed to get config ${key}:`, err);
    return configCache[key] ? configCache[key].value : "false";
  }
}

export const systemMiddleware = async (req: any, res: Response, next: NextFunction) => {
  const path = req.path;
  const method = req.method;

  // Let admin routes, auth login/me, and health endpoints bypass maintenance/shutdown
  const isBypassRoute = 
    path.startsWith("/admin") || 
    path.startsWith("/auth/login") || 
    path.startsWith("/auth/me") ||
    path === "/admin/health" ||
    path === "/";

  try {
    // 1. Check Emergency Shutdown
    const shutdown = await getConfigValue("EMERGENCY_SHUTDOWN");
    if (shutdown === "true" && !isBypassRoute) {
      return res.status(503).json({ 
        error: "System shutdown: The system has been temporarily shut down by an administrator.",
        maintenance: true
      });
    }

    // 2. Check Maintenance Mode
    const maintenance = await getConfigValue("MAINTENANCE_MODE");
    if (maintenance === "true" && !isBypassRoute) {
      return res.status(503).json({ 
        error: "Under maintenance: The platform is undergoing scheduled maintenance. Please check back later.",
        maintenance: true
      });
    }

    // 3. Check Read-Only Mode
    if (["POST", "PUT", "DELETE", "PATCH"].includes(method) && !isBypassRoute) {
      const readOnly = await getConfigValue("READ_ONLY_MODE");
      if (readOnly === "true") {
        return res.status(403).json({ 
          error: "Read-only: The system is currently in read-only mode for maintenance. Writes are disabled.",
          readOnly: true
        });
      }
    }

    next();
  } catch (error) {
    console.error("[System Middleware] Error:", error);
    next();
  }
};
