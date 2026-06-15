import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware";
import { tenantMiddleware } from "../../shared/middlewares/tenant.middleware";
import {
  createOrderHandler,
  getOrdersHandler,
  getOrderByIdHandler,
  updateStatusHandler,
} from "./order.controller";

const router = Router();

// Protect all order routes
router.use(authMiddleware as any);

router.post("/", createOrderHandler as any);
router.get("/", getOrdersHandler as any);
router.get("/:id", tenantMiddleware("order") as any, getOrderByIdHandler as any);
router.patch("/:id/status", tenantMiddleware("order") as any, updateStatusHandler as any);

export default router;