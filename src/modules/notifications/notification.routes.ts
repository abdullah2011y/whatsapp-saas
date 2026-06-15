import { Router, Response } from "express";
import { AuthenticatedRequest, authMiddleware } from "../auth/auth.middleware";
import prisma from "../../config/database";

const router = Router();
router.use(authMiddleware as any);

// GET /notifications - List all notifications for the logged-in user
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    res.json(notifications);
  } catch (error) {
    console.error("[Notifications API] Fetch notifications error:", error);
    res.status(500).json({ error: "Failed to load notifications." });
  }
});

// PUT /notifications/read-all - Mark all notifications as read for the user
router.put("/read-all", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    res.json({ message: "All notifications marked as read." });
  } catch (error) {
    console.error("[Notifications API] Mark read-all error:", error);
    res.status(500).json({ error: "Failed to update notifications." });
  }
});

// PUT /notifications/:id/read - Mark specific notification as read
router.put("/:id/read", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const id = String(req.params.id);

    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found." });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    res.json(updated);
  } catch (error) {
    console.error("[Notifications API] Mark read error:", error);
    res.status(500).json({ error: "Failed to update notification." });
  }
});

// DELETE /notifications/:id - Delete a specific notification
router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const id = String(req.params.id);

    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found." });
    }

    await prisma.notification.delete({
      where: { id },
    });

    res.json({ message: "Notification deleted successfully." });
  } catch (error) {
    console.error("[Notifications API] Delete notification error:", error);
    res.status(500).json({ error: "Failed to delete notification." });
  }
});

export default router;
