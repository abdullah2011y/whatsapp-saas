import { apiFetch } from "./client";

export interface Order {
  id: string;
  customer: string;
  phone: string;
  product: string;
  amount: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | string;
  createdAt: string;
}

export const fetchOrders = async (): Promise<Order[]> => {
  const response = await apiFetch("/orders");
  if (!response.ok) {
    throw new Error("Failed to fetch orders");
  }
  return response.json();
};

export const updateOrderStatus = async (id: string, status: string): Promise<Order> => {
  const response = await apiFetch(`/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    throw new Error("Failed to update order status");
  }
  return response.json();
};
