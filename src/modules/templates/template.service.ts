import prisma from "../../config/database";

export const renderTemplate = (content: string, order: any): string => {
  if (!content) return "";
  
  const customerName = order.customer || "Valued Customer";
  const orderNumber = order.orderName || (order.orderNumber ? `#${order.orderNumber}` : order.id.substring(0, 8));
  const productName = order.product || "Unknown Product";
  const amount = order.amount !== undefined ? `Rs ${order.amount}` : "N/A";
  const city = order.city || "N/A";
  const trackingNumber = order.trackingNumber || order.id.substring(0, 8);
  const courierName = order.courierName || "ByteCourier";

  return content
    .replace(/\{\{customer_name\}\}/g, customerName)
    .replace(/\{\{order_number\}\}/g, orderNumber)
    .replace(/\{\{product_name\}\}/g, productName)
    .replace(/\{\{amount\}\}/g, amount)
    .replace(/\{\{city\}\}/g, city)
    .replace(/\{\{tracking_number\}\}/g, trackingNumber)
    .replace(/\{\{courier_name\}\}/g, courierName);
};

export const createTemplate = async (userId: string, name: string, content: string) => {
  return await prisma.template.create({
    data: { userId, name, content }
  });
};

export const getTemplates = async (userId: string) => {
  return await prisma.template.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });
};

export const getTemplateById = async (userId: string, id: string) => {
  return await prisma.template.findFirst({
    where: { id, userId }
  });
};

export const updateTemplate = async (userId: string, id: string, name: string, content: string) => {
  // Ensure template belongs to the user
  return await prisma.template.update({
    where: { id, userId },
    data: { name, content }
  });
};

export const deleteTemplate = async (userId: string, id: string) => {
  // Ensure template belongs to the user
  return await prisma.template.delete({
    where: { id, userId }
  });
};
