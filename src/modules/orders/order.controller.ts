import { Response } from "express";
import { AuthenticatedRequest } from "../auth/auth.middleware";
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
} from "./order.service";

export const getOrderByIdHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const id = String(req.params.id);
    const order = await getOrderById(userId, id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (error) {
    console.error(`[Orders] Failed to fetch order by id:`, error);
    res.status(500).json({ error: "Failed to fetch order" });
  }
};

export const createOrderHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const order = await createOrder(userId, req.body);
    res.json(order);
  } catch (error: any) {
    console.error(`[Orders] Failed to create order:`, error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

export const getOrdersHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const search = req.query.search ? String(req.query.search) : undefined;
    const orders = await getOrders(userId, search);
    console.log(`[Orders] Orders fetched. User: ${userId}, Search: ${search || "none"}. Total orders count: ${orders.length}`);
    res.json(orders);
  } catch (error) {
    console.error(`[Orders] Failed to fetch orders:`, error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};

export const updateStatusHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const id = String(req.params.id);
    const { status, trackingNumber, courierName } = req.body;

    const allowed = ["PENDING", "CONFIRMED", "CANCELLED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Verify order belongs to user first
    const order = await getOrderById(userId, id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const updated = await updateOrderStatus(id, status, trackingNumber, courierName);
    console.log(`[Orders] Order status updated. ID: ${id}, New Status: ${status}`);
    res.json(updated);
  } catch (error) {
    console.error(`[Orders] Failed to update status:`, error);
    res.status(500).json({ error: "Failed to update status" });
  }
};