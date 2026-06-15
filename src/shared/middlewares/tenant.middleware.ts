import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../modules/auth/auth.middleware";
import prisma from "../../config/database";

export const tenantMiddleware = (modelName: "order" | "template" | "automation" | "settings" | "whatsappSession" | "whatsappPoll") => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized: Please log in." });
    }

    const resourceId = req.params.id;
    if (!resourceId) {
      return next();
    }

    try {
      const dbModel = prisma[modelName] as any;
      if (!dbModel) {
        return res.status(500).json({ error: `System error: model ${modelName} not found.` });
      }

      const resource = await dbModel.findUnique({
        where: { id: resourceId }
      });

      if (!resource) {
        return res.status(404).json({ error: "Resource not found" });
      }

      if (resource.userId !== req.user.id) {
        return res.status(403).json({ error: "Forbidden: You do not own this resource." });
      }

      next();
    } catch (err) {
      console.error(`[Tenant Middleware] Error verifying resource ownership for ${modelName}:`, err);
      return res.status(500).json({ error: "Failed to verify resource ownership." });
    }
  };
};
