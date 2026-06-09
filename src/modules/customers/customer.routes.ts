import { Router } from "express";
import { getCustomerByIdHandler, getCustomerOrdersHandler } from "./customer.controller";
import { authMiddleware } from "../auth/auth.middleware";

const router = Router();
router.use(authMiddleware as any);

router.get("/:id", getCustomerByIdHandler);
router.get("/:phone/orders", getCustomerOrdersHandler);

export default router;
