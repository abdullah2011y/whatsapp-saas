import prisma from "../../config/database";
import { triggerAutomation } from "../templates/automation.service";

export const createOrder = async (userId: string, data: any) => {
  const count = await prisma.order.count({ where: { userId } });
  const nextOrderNumber = 1000 + count + 1;

  const order = await prisma.order.create({
    data: {
      userId,
      customer: data.customer || "Unknown Customer",
      phone: data.phone,
      product: data.product,
      amount: data.amount,
      orderNumber: data.orderNumber || nextOrderNumber,
      orderName: data.orderName || `#${data.orderNumber || nextOrderNumber}`,
      customerEmail: data.customerEmail || null,
      shopifyCustomerId: data.shopifyCustomerId || null,
      address1: data.address1 || null,
      address2: data.address2 || null,
      city: data.city || null,
      province: data.province || null,
      zip: data.zip || null,
      country: data.country || null,
      trackingNumber: data.trackingNumber || null,
      courierName: data.courierName || null,
    },
  });

  await triggerAutomation("ORDER_CREATED", order);

  return order;
};

export const getOrders = async (userId: string, search?: string) => {
  const where: any = { userId };
  if (search) {
    const cleanSearch = search.trim();
    const searchNumber = parseInt(cleanSearch, 10);
    const isInteger = /^-?\d+$/.test(cleanSearch);
    const is32BitSignedInteger = isInteger && searchNumber >= -2147483648 && searchNumber <= 2147483647;

    const OR: any[] = [
      { id: { contains: search, mode: "insensitive" } },
      { orderName: { contains: search, mode: "insensitive" } },
      { customer: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { product: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
    ];
    if (is32BitSignedInteger) {
      OR.push({ orderNumber: searchNumber });
    }
    where.AND = [{ OR }];
  }

  return await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
};

export const getOrderById = async (userId: string, id: string) => {
  return await prisma.order.findFirst({
    where: { id, userId }
  });
};

export const updateOrderStatus = async (
  id: string,
  status: string,
  trackingNumber?: string,
  courierName?: string
) => {
  const updateData: any = { status };
  if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;
  if (courierName !== undefined) updateData.courierName = courierName;

  const order = await prisma.order.update({
    where: { id },
    data: updateData,
  });

  let triggerType: string | null = null;
  if (status === "CONFIRMED") triggerType = "ORDER_CONFIRMED";
  else if (status === "CANCELLED") triggerType = "ORDER_CANCELLED";
  else if (status === "SHIPPED") triggerType = "ORDER_SHIPPED";
  else if (status === "OUT_FOR_DELIVERY") triggerType = "OUT_FOR_DELIVERY";
  else if (status === "DELIVERED") triggerType = "DELIVERED";

  if (triggerType) {
    triggerAutomation(triggerType, order).catch((err) => {
      console.error(`[Order Status Trigger] Failed for trigger ${triggerType}:`, err);
    });
  }

  return order;
};