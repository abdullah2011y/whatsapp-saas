import prisma from "../../config/database";

export const getCustomerOrders = async (userId: string, idOrPhone: string) => {
  return await prisma.order.findMany({
    where: {
      userId,
      OR: [
        { phone: idOrPhone },
        { shopifyCustomerId: idOrPhone },
        { customerEmail: idOrPhone },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
};

export const getCustomerById = async (userId: string, idOrPhone: string) => {
  const orders = await getCustomerOrders(userId, idOrPhone);
  if (orders.length === 0) {
    return null;
  }

  // The orders are sorted by createdAt desc, so orders[0] is the most recent order.
  const latestOrder = orders[0]; 

  const confirmedOrders = orders.filter(o => o.status === "CONFIRMED");
  const cancelledOrders = orders.filter(o => o.status === "CANCELLED");

  // Sum all order amounts for spending metric
  const totalSpent = orders.reduce((sum, o) => sum + o.amount, 0);

  const confirmationRate = orders.length > 0
    ? Number(((confirmedOrders.length / orders.length) * 100).toFixed(1))
    : 0;

  const firstOrder = orders[orders.length - 1]; // Earliest order

  const addressParts = [
    latestOrder.address1,
    latestOrder.address2,
  ].filter(Boolean);
  const shippingAddress = addressParts.join(", ") || null;

  return {
    id: idOrPhone,
    name: latestOrder.customer || "Unknown Customer",
    phone: latestOrder.phone,
    email: latestOrder.customerEmail || null,
    shippingAddress,
    city: latestOrder.city || null,
    province: latestOrder.province || null,
    postalCode: latestOrder.zip || null,
    country: latestOrder.country || null,
    totalOrders: orders.length,
    totalSpending: totalSpent,
    confirmationRate,
    cancelledOrders: cancelledOrders.length,
    customerSince: firstOrder.createdAt,
    lastOrderDate: latestOrder.createdAt,
    shopifyCustomerId: latestOrder.shopifyCustomerId || null,
  };
};
