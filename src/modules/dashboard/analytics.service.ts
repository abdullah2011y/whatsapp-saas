import prisma from "../../config/database";

export const getAnalyticsOverview = async () => {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "asc" }
  });

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentYear = new Date().getFullYear();
  
  const chartData = months.map(month => ({
    name: month,
    total: 0,
    orders: 0,
    confirmations: 0,
    cancellations: 0
  }));

  orders.forEach(order => {
    const d = new Date(order.createdAt);
    if (d.getFullYear() === currentYear) {
      const monthIdx = d.getMonth();
      chartData[monthIdx].orders += 1;
      
      if (order.status === "CONFIRMED") {
        chartData[monthIdx].total += order.amount;
        chartData[monthIdx].confirmations += 1;
      } else if (order.status === "CANCELLED") {
        chartData[monthIdx].cancellations += 1;
      }
    }
  });

  return chartData;
};

export const getTopProducts = async () => {
  const orders = await prisma.order.findMany();
  
  const productMap = new Map<string, {
    product: string;
    totalSales: number;
    confirmations: number;
    cancellations: number;
    revenue: number;
  }>();

  orders.forEach(o => {
    const key = o.product || "Unknown Product";
    if (!productMap.has(key)) {
      productMap.set(key, {
        product: key,
        totalSales: 0,
        confirmations: 0,
        cancellations: 0,
        revenue: 0
      });
    }

    const item = productMap.get(key)!;
    item.totalSales += 1;
    if (o.status === "CONFIRMED") {
      item.confirmations += 1;
      item.revenue += o.amount;
    } else if (o.status === "CANCELLED") {
      item.cancellations += 1;
    }
  });

  return Array.from(productMap.values()).sort((a, b) => b.totalSales - a.totalSales);
};

export const getCustomerAnalytics = async () => {
  const orders = await prisma.order.findMany();
  
  const customerMap = new Map<string, {
    name: string;
    phone: string;
    email: string | null;
    totalSpent: number;
    orderCount: number;
    confirmedCount: number;
  }>();

  orders.forEach(o => {
    const key = o.phone;
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        name: o.customer,
        phone: o.phone,
        email: o.customerEmail || null,
        totalSpent: 0,
        orderCount: 0,
        confirmedCount: 0
      });
    }

    const c = customerMap.get(key)!;
    c.orderCount += 1;
    if (o.status === "CONFIRMED") {
      c.totalSpent += o.amount;
      c.confirmedCount += 1;
    }
  });

  const customersList = Array.from(customerMap.values());
  const totalCustomers = customersList.length;
  const repeatCustomersCount = customersList.filter(c => c.orderCount > 1).length;
  const repeatCustomerRate = totalCustomers > 0
    ? Number(((repeatCustomersCount / totalCustomers) * 100).toFixed(1))
    : 0.0;

  const overallConfirmations = orders.filter(o => o.status === "CONFIRMED").length;
  const overallConfirmationRate = orders.length > 0
    ? Number(((overallConfirmations / orders.length) * 100).toFixed(1))
    : 0.0;

  const topSpenders = customersList
    .map(c => ({
      name: c.name,
      phone: c.phone,
      email: c.email,
      totalSpent: c.totalSpent,
      orderCount: c.orderCount,
      confirmationRate: c.orderCount > 0
        ? Number(((c.confirmedCount / c.orderCount) * 100).toFixed(1))
        : 0.0
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10);

  return {
    totalCustomers,
    repeatCustomersCount,
    repeatCustomerRate,
    overallConfirmationRate,
    topSpenders
  };
};
