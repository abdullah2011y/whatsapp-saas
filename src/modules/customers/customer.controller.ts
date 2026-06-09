import { Response } from "express";
import { AuthenticatedRequest } from "../auth/auth.middleware";
import { getCustomerById, getCustomerOrders } from "./customer.service";

export const getCustomerByIdHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const id = String(req.params.id);
    const customer = await getCustomerById(userId, id);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.json(customer);
  } catch (error) {
    console.error(`[Customers] Failed to fetch customer details for ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to fetch customer details" });
  }
};

export const getCustomerOrdersHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const phone = String(req.params.phone);
    const orders = await getCustomerOrders(userId, phone);
    res.json(orders);
  } catch (error) {
    console.error(`[Customers] Failed to fetch customer orders for ${req.params.phone}:`, error);
    res.status(500).json({ error: "Failed to fetch customer orders" });
  }
};
