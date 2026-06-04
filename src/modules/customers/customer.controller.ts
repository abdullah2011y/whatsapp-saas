import { Request, Response } from "express";
import { getCustomerById, getCustomerOrders } from "./customer.service";

export const getCustomerByIdHandler = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const customer = await getCustomerById(id);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.json(customer);
  } catch (error) {
    console.error(`[Customers] Failed to fetch customer details for ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to fetch customer details" });
  }
};

export const getCustomerOrdersHandler = async (req: Request, res: Response) => {
  try {
    const phone = String(req.params.phone);
    const orders = await getCustomerOrders(phone);
    res.json(orders);
  } catch (error) {
    console.error(`[Customers] Failed to fetch customer orders for ${req.params.phone}:`, error);
    res.status(500).json({ error: "Failed to fetch customer orders" });
  }
};
