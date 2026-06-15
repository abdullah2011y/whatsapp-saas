import { Router, Response } from "express";
import { authMiddleware, AuthenticatedRequest } from "../auth/auth.middleware";
import { tenantMiddleware } from "../../shared/middlewares/tenant.middleware";
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate
} from "./template.service";

const router = Router();

import { licenseMiddleware } from "../../shared/middlewares/license.middleware";

// Protect all template routes
router.use(authMiddleware as any);
router.use(licenseMiddleware as any);

router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const templates = await getTemplates(userId);
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const { name, content } = req.body;
    if (!name || !content) {
      return res.status(400).json({ error: "Missing name or content" });
    }
    const template = await createTemplate(userId, name, content);
    res.status(201).json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", tenantMiddleware("template") as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const id = String(req.params.id);
    const { name, content } = req.body;
    if (!name || !content) {
      return res.status(400).json({ error: "Missing name or content" });
    }
    const template = await updateTemplate(userId, id, name, content);
    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", tenantMiddleware("template") as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const id = String(req.params.id);
    await deleteTemplate(userId, id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
