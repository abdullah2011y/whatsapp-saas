import { Request, Response } from "express";
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
} from "./order.service";

export const getOrderByIdHandler = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const order = await getOrderById(id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (error) {
    console.error(`[Orders] Failed to fetch order by id:`, error);
    res.status(500).json({ error: "Failed to fetch order" });
  }
};

export const createOrderHandler = async (req: Request, res: Response) => {
  try {
    const order = await createOrder(req.body);
    res.json(order);
  } catch {
    res.status(500).json({ error: "Something went wrong" });
  }
};

export const getOrdersHandler = async (req: Request, res: Response) => {
  try {
    const search = req.query.search ? String(req.query.search) : undefined;
    const orders = await getOrders(search);
    console.log(`[Orders] Orders fetched. Search: ${search || "none"}. Total orders count: ${orders.length}`);
    res.json(orders);
  } catch (error) {
    console.error(`[Orders] Failed to fetch orders:`, error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};

export const updateStatusHandler = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { status, trackingNumber, courierName } = req.body;

    const allowed = ["PENDING", "CONFIRMED", "CANCELLED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const updated = await updateOrderStatus(id, status, trackingNumber, courierName);
    console.log(`[Orders] Order status updated. ID: ${id}, New Status: ${status}`);
    res.json(updated);
  } catch (error) {
    console.error(`[Orders] Failed to update status:`, error);
    res.status(500).json({ error: "Failed to update status" });
  }
};