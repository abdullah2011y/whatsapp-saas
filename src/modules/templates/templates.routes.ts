import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// Get all templates
router.get("/", async (req, res) => {
  try {
    const templates = await prisma.template.findMany({
      orderBy: { updatedAt: 'desc' }
    });
    res.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Save or Update a template
router.post("/", async (req, res) => {
  const { id, name, content } = req.body;
  try {
    let template;
    if (id) {
      template = await prisma.template.update({
        where: { id },
        data: { name, content },
      });
    } else {
      template = await prisma.template.create({
        data: { name, content },
      });
    }
    res.json(template);
  } catch (error) {
    console.error("Error saving template:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
