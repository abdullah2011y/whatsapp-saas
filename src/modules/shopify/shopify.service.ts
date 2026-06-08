import prisma from "../../config/database";
import { triggerAutomation } from "../templates/automation.service";

export const handleShopifyOrderCreate = async (payload: any, shopDomain?: string) => {
  const shopifyOrderId = String(payload.id);

  // Find tenant by shop domain
  let userId = "97e2acb1-0bee-4b31-be9e-3e31f8b4a916"; // Primary user default fallback
  if (shopDomain) {
    const settings = await prisma.settings.findFirst({
      where: { shopifyDomain: shopDomain }
    });
    if (settings) {
      userId = settings.userId;
    }
  }

  // Check for duplicate
  const existingOrder = await prisma.order.findUnique({
    where: { shopifyOrderId } as any,
  });

  if (existingOrder) {
    console.log(`[Shopify Webhook] Duplicate order skipped. Order ID: ${shopifyOrderId}`);
    return existingOrder;
  }

  // Extract customer info
  const customerName = payload.customer 
    ? `${payload.customer.first_name || ""} ${payload.customer.last_name || ""}`.trim() 
    : (payload.shipping_address
      ? `${payload.shipping_address.first_name || ""} ${payload.shipping_address.last_name || ""}`.trim()
      : "Unknown Customer");
  
  const phone = payload.shipping_address?.phone || payload.customer?.phone || payload.phone || "Unknown Phone";
  
  // Extract product info
  const productTitle = payload.line_items?.[0]?.title || "Unknown Product";
  
  // Extract amount
  const amount = parseFloat(payload.total_price || "0");
  
  // Extract created time
  const createdAt = payload.created_at ? new Date(payload.created_at) : new Date();

  // Extract Shopify identifiers
  const orderNumber = payload.order_number ? Number(payload.order_number) : null;
  const orderName = payload.name || (payload.order_number ? `#${payload.order_number}` : null);
  const customerEmail = payload.customer?.email || payload.email || null;
  const shopifyCustomerId = payload.customer?.id ? String(payload.customer.id) : null;

  // Extract shipping address fields
  const address1 = payload.shipping_address?.address1 || null;
  const address2 = payload.shipping_address?.address2 || null;
  const city = payload.shipping_address?.city || null;
  const province = payload.shipping_address?.province || null;
  const zip = payload.shipping_address?.zip || null;
  const country = payload.shipping_address?.country || null;

  console.log(`[Shopify Webhook] Saving new order for user ${userId}: ${shopifyOrderId} (${orderName})`);

  // Create new order in Prisma
  const newOrder = await prisma.order.create({
    data: {
      userId,
      shopifyOrderId,
      customer: customerName || "Unknown Customer",
      phone: phone,
      product: productTitle,
      amount: amount,
      status: "PENDING",
      orderNumber,
      orderName,
      customerEmail,
      shopifyCustomerId,
      address1,
      address2,
      city,
      province,
      zip,
      country,
      createdAt,
    },
  });

  console.log(`[Shopify Webhook] Prisma save success. Database ID: ${newOrder.id}`);

  // Auto WhatsApp message
  console.log(`[Shopify Webhook] Sending WhatsApp confirmation/automation for order: ${newOrder.id}`);
  try {
    await triggerAutomation("ORDER_CREATED", newOrder);
    console.log(`[Shopify Webhook] WhatsApp trigger success for order: ${newOrder.id}`);
  } catch (error) {
    console.error(`[Shopify Webhook] WhatsApp trigger failure for order: ${newOrder.id}`, error);
  }

  return newOrder;
};
