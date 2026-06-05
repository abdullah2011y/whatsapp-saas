import { API_BASE_URL } from "@/shared/config/api";

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
  const response = await fetch(`${API_BASE_URL}/orders`);
  if (!response.ok) {
    throw new Error("Failed to fetch orders");
  }
  return response.json();
};

export const updateOrderStatus = async (id: string, status: string): Promise<Order> => {
  const response = await fetch(`${API_BASE_URL}/orders/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    throw new Error("Failed to update order status");
  }
  return response.json();
};
