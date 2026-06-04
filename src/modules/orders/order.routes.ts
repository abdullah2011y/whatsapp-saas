import { Router } from "express";
import {
  createOrderHandler,
  getOrdersHandler,
  getOrderByIdHandler,
  updateStatusHandler,
} from "./order.controller";

const router = Router();

router.post("/", createOrderHandler);
router.get("/", getOrdersHandler);          // ✅ ye line honi chahiye
router.get("/:id", getOrderByIdHandler);
router.patch("/:id/status", updateStatusHandler);

export default router;