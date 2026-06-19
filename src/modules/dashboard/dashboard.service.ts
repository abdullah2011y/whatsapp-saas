import prisma from "../../config/database";

export const getDashboardStats = async (userId: string) => {
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });

  const totalOrders = orders.length;
  const confirmedOrders = orders.filter(o => o.status === "CONFIRMED").length;
  const cancelledOrders = orders.filter(o => o.status === "CANCELLED").length;
  const pendingOrders = orders.filter(o => o.status === "PENDING").length;
  
  const totalRevenue = orders
    .filter(o => o.status === "CONFIRMED")
    .reduce((sum, order) => sum + order.amount, 0);

  const confirmationRate = totalOrders > 0 
    ? Number(((confirmedOrders / totalOrders) * 100).toFixed(1))
    : 0.0;

  const cancellationRate = totalOrders > 0
    ? Number(((cancelledOrders / totalOrders) * 100).toFixed(1))
    : 0.0;

  const recentActivity = orders.slice(0, 5);

  return {
    totalRevenue,
    totalOrders,
    confirmedOrders,
    cancelledOrders,
    pendingOrders,
    confirmationRate,
    cancellationRate,
    recentActivity
  };
};

export const getAnalyticsData = async (userId: string) => {
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" }
  });

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentYear = new Date().getFullYear();
  
  const chartData = months.map(month => ({
    name: month,
    total: 0,
    orders: 0
  }));

  orders.forEach(order => {
    const d = new Date(order.createdAt);
    if (d.getFullYear() === currentYear && order.status === "CONFIRMED") {
      const monthIdx = d.getMonth();
      chartData[monthIdx].total += order.amount;
      chartData[monthIdx].orders += 1;
    }
  });

  return chartData;
};

export const getCustomers = async (userId: string) => {
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });

  // Group to derive unique customers
  const customerMap = new Map<string, {
    name: string;
    phone: string;
    email: string | null;
    ordersCount: number;
    totalSpent: number;
    lastOrderDate: Date;
    orders: typeof orders;
  }>();

  orders.forEach(order => {
    // Generate a unique key for grouping.
    // Try shopifyCustomerId, then customerEmail, then phone (if it's not "Unknown Phone").
    // If all are missing/defaults, fall back to "Unknown Phone".
    let key = order.shopifyCustomerId || order.customerEmail;
    if (!key && order.phone && order.phone !== "Unknown Phone") {
      key = order.phone;
    }
    if (!key) {
      key = "Unknown Phone";
    }

    if (!customerMap.has(key)) {
      customerMap.set(key, {
        name: order.customer,
        phone: order.phone,
        email: order.customerEmail || null,
        ordersCount: 0,
        totalSpent: 0,
        lastOrderDate: order.createdAt,
        orders: []
      });
    }
    const entry = customerMap.get(key)!;
    entry.ordersCount += 1;
    entry.totalSpent += order.amount;
    entry.orders.push(order);
    if (order.createdAt > entry.lastOrderDate) {
      entry.lastOrderDate = order.createdAt;
    }
  });

  return Array.from(customerMap.entries()).map(([key, data]) => ({
    id: key,
    name: data.name,
    phone: data.phone,
    email: data.email,
    ordersCount: data.ordersCount,
    totalSpent: data.totalSpent,
    lastOrderDate: data.lastOrderDate,
    orders: data.orders
  }));
};
