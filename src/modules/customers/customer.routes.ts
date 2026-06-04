import { Router } from "express";
import { getCustomerByIdHandler, getCustomerOrdersHandler } from "./customer.controller";

const router = Router();

router.get("/:id", getCustomerByIdHandler);
router.get("/:phone/orders", getCustomerOrdersHandler);

export default router;
