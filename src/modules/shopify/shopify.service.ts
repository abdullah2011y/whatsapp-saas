import prisma from "../../config/database";
import { triggerAutomation } from "../templates/automation.service";

export const handleShopifyOrderCreate = async (payload: any, shopDomain?: string, userId?: string) => {
  const shopifyOrderId = String(payload.id);

  let cleanShopDomain = shopDomain ? shopDomain.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/+$/, "") : undefined;

  // 1. Find Settings by shopifyDomain
  let settings = null;
  if (cleanShopDomain) {
    settings = await prisma.settings.findFirst({
      where: { shopifyDomain: cleanShopDomain }
    });
  }

  // 2. Extract settings.userId
  const settingsUserId = settings?.userId;

  // If userId is passed via webhook query/routing, we use it for checking, otherwise we use settingsUserId
  const resolvedUserId = settingsUserId || userId;

  // 3. Verify User exists
  const user = resolvedUserId 
    ? await prisma.user.findUnique({ where: { id: resolvedUserId } }) 
    : null;

  // Diagnostic logs
  console.log(`Resolved userId: ${resolvedUserId || "undefined"}`);
  console.log(`Resolved shop domain: ${cleanShopDomain || "undefined"}`);
  console.log(`User exists: ${!!user}`);
  console.log(`Settings exists: ${!!settings}`);

  console.log(`Webhook shop domain: ${cleanShopDomain || "undefined"}`);
  console.log(`Settings found: ${!!settings}`);
  console.log(`Settings userId: ${settingsUserId || "undefined"}`);
  console.log(`User found: ${!!user}`);
  console.log(`Order owner: ${user?.id || "undefined"}`);

  // 4. Verify Settings.userId === User.id (and user exists)
  // If settings exist, settingsUserId must match the existing user.id.
  // Since we also want to verify that settingsUserId matches the resolvedUserId (if both exist)
  const isSettingsOwnerValid = settings && user ? settingsUserId === user.id : true;
  const isUserValid = !!user;

  if (!isUserValid || !resolvedUserId || !isSettingsOwnerValid || (userId && settingsUserId && userId !== settingsUserId)) {
    console.error(`[Shopify Webhook] Error: Shopify order import failed. Resolved owner user does not exist or settings mapping is invalid.`);
    throw new Error("No valid user ownership mapped for this Shopify order");
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

  console.log(`[Shopify Webhook] Saving new order for user ${resolvedUserId}: ${shopifyOrderId} (${orderName})`);

  // Create new order in Prisma
  const newOrder = await prisma.order.create({
    data: {
      userId: resolvedUserId,
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
