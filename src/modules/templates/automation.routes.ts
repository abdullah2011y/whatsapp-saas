import { Router, Request, Response } from "express";
import { getAutomations, updateAutomation } from "./automation.service";

const router = Router();

router.get("/", async (_: Request, res: Response) => {
  try {
    const automations = await getAutomations();
    res.json(automations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { trigger, isEnabled, templateId } = req.body;
    if (!trigger) {
      return res.status(400).json({ error: "Missing trigger type" });
    }
    const automation = await updateAutomation(trigger, !!isEnabled, templateId || null);
    res.json(automation);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
