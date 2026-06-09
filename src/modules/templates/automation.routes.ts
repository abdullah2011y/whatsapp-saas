import { Router, Response } from "express";
import { authMiddleware, AuthenticatedRequest } from "../auth/auth.middleware";
import { getAutomations, updateAutomation } from "./automation.service";

const router = Router();

// Protect all automation routes
router.use(authMiddleware as any);

router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const automations = await getAutomations(userId);
    res.json(automations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const { trigger, isEnabled, templateId, providerOverride } = req.body;
    if (!trigger) {
      return res.status(400).json({ error: "Missing trigger type" });
    }
    const automation = await updateAutomation(userId, trigger, !!isEnabled, templateId || null, providerOverride || null);
    res.json(automation);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
