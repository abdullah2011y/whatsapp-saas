import { Router, Request, Response } from "express";
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate
} from "./template.service";

const router = Router();

router.get("/", async (_: Request, res: Response) => {
  try {
    const templates = await getTemplates();
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, content } = req.body;
    if (!name || !content) {
      return res.status(400).json({ error: "Missing name or content" });
    }
    const template = await createTemplate(name, content);
    res.status(201).json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { name, content } = req.body;
    if (!name || !content) {
      return res.status(400).json({ error: "Missing name or content" });
    }
    const template = await updateTemplate(id, name, content);
    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    await deleteTemplate(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
