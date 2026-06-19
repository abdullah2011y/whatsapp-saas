import prisma from "../../config/database";
import { triggerAutomation } from "../templates/automation.service";
export const handleShopifyOrderCreate = async (payload: any, shopDomain?: string, userId?: string) => {
  const shopifyOrderId = String(payload.id);
  
  console.log(`[Shopify Service] ORDER_CREATE_ATTEMPT: true. Order ID: ${shopifyOrderId}`);

  let cleanShopDomain = shopDomain ? shopDomain.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/+$/, "") : undefined;

  // 1. Find Settings: Resolve directly by userId first if it exists, otherwise fallback to shopifyDomain
  let settings = null;
  if (userId) {
    settings = await prisma.settings.findUnique({
      where: { userId }
    });
  } else if (cleanShopDomain) {
    settings = await prisma.settings.findFirst({
      where: { shopifyDomain: cleanShopDomain }
    });
  }

  // 2. Extract settingsUserId
  const settingsUserId = settings?.userId;

  // 3. Resolve userId
  const resolvedUserId = settingsUserId || userId;

  // 4. Fetch User
  const user = resolvedUserId 
    ? await prisma.user.findUnique({ where: { id: resolvedUserId } }) 
    : null;

  // Permanent Debug Logs
  console.log(`[Shopify Service] QUERY_USER_ID: ${userId || "undefined"}`);
  console.log(`[Shopify Service] SHOP_DOMAIN: ${cleanShopDomain || "undefined"}`);
  console.log(`[Shopify Service] SETTINGS_FOUND: ${!!settings}`);
  console.log(`[Shopify Service] SETTINGS_ID: ${settings?.id || "undefined"}`);
  console.log(`[Shopify Service] SETTINGS_USER_ID: ${settingsUserId || "undefined"}`);
  console.log(`[Shopify Service] USER_FOUND: ${!!user}`);
  console.log(`[Shopify Service] USER_ID: ${user?.id || "undefined"}`);
  console.log(`[Shopify Service] USER_EMAIL: ${user?.email || "undefined"}`);
  console.log(`[Shopify Service] ORDER_ID: ${shopifyOrderId}`);

  // 5. Multi-Tenant Security Validation & User Existence Checks
  if (!resolvedUserId) {
    console.error(`[Shopify Service] Error: No user ID resolved for order sync.`);
    throw new Error("No valid user ownership mapped for this Shopify order");
  }

  if (!user) {
    console.error(`[Shopify Service] Error: User not found for resolved ID ${resolvedUserId}.`);
    throw new Error("No valid user ownership mapped for this Shopify order");
  }

  if (settings && settings.userId !== resolvedUserId) {
    console.error(`[Shopify Service] Tenant isolation error: settings.userId ${settings.userId} does not match resolvedUserId ${resolvedUserId}`);
    throw new Error(`Tenant isolation error: settings.userId ${settings.userId} does not match resolvedUserId ${resolvedUserId}`);
  }

  if (user.id !== resolvedUserId) {
    console.error(`[Shopify Service] Tenant isolation error: user.id ${user.id} does not match resolvedUserId ${resolvedUserId}`);
    throw new Error(`Tenant isolation error: user.id ${user.id} does not match resolvedUserId ${resolvedUserId}`);
  }

  if (userId && settingsUserId && userId !== settingsUserId) {
    console.error(`[Shopify Service] Tenant isolation error: query userId ${userId} does not match settings.userId ${settingsUserId}`);
    throw new Error(`Tenant isolation error: query userId ${userId} does not match settings.userId ${settingsUserId}`);
  }

  if (userId && user.id !== userId) {
    console.error(`[Shopify Service] Tenant isolation error: query userId ${userId} does not match user.id ${user.id}`);
    throw new Error(`Tenant isolation error: query userId ${userId} does not match user.id ${user.id}`);
  }

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

  console.log(`[Shopify Service] ORDER_SAVED_SUCCESSFULLY: true. Database ID: ${newOrder.id}`);

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
