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

  // Add debug logs for payload properties
  console.log(`[Shopify Service Payload Debug] payload.customer:`, JSON.stringify(payload.customer));
  console.log(`[Shopify Service Payload Debug] payload.customer.first_name:`, payload.customer?.first_name);
  console.log(`[Shopify Service Payload Debug] payload.customer.last_name:`, payload.customer?.last_name);
  console.log(`[Shopify Service Payload Debug] payload.customer.phone:`, payload.customer?.phone);
  console.log(`[Shopify Service Payload Debug] payload.billing_address:`, JSON.stringify(payload.billing_address));
  console.log(`[Shopify Service Payload Debug] payload.shipping_address:`, JSON.stringify(payload.shipping_address));
  console.log(`[Shopify Service Payload Debug] payload.total_price:`, payload.total_price);
  console.log(`[Shopify Service Payload Debug] payload.current_total_price:`, payload.current_total_price);
  console.log(`[Shopify Service Payload Debug] payload.line_items:`, JSON.stringify(payload.line_items));
  console.log(`[Shopify Service Payload Debug] payload.currency:`, payload.currency);

  // Extract customer info
  let resolvedCustomerName = "";
  if (payload.customer) {
    resolvedCustomerName = `${payload.customer.first_name || ""} ${payload.customer.last_name || ""}`.trim();
  }
  if (!resolvedCustomerName && payload.shipping_address) {
    resolvedCustomerName = (payload.shipping_address.name || "").trim();
  }
  if (!resolvedCustomerName && payload.billing_address) {
    resolvedCustomerName = (payload.billing_address.name || "").trim();
  }
  if (!resolvedCustomerName) {
    resolvedCustomerName = "Unknown Customer";
  }
  
  let resolvedPhone = (
    payload.shipping_address?.phone || 
    payload.billing_address?.phone || 
    payload.customer?.phone || 
    payload.customer?.default_address?.phone ||
    payload.phone || 
    ""
  ).trim();

  if (!resolvedPhone) {
    resolvedPhone = "Unknown Phone";
  }
  
  // Extract product info
  const productTitle = payload.line_items?.[0]?.title || "Unknown Product";
  
  // Extract amount with fallback to total_price
  let rawAmount = payload.current_total_price ?? payload.total_price ?? "0";
  let resolvedAmount = parseFloat(String(rawAmount));
  if (isNaN(resolvedAmount)) {
    resolvedAmount = 0;
  }
  
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
  
  // Log final resolved values right before database insertion
  console.log(`[Shopify Service Resolved Values] resolvedCustomerName: ${resolvedCustomerName}`);
  console.log(`[Shopify Service Resolved Values] resolvedPhone: ${resolvedPhone}`);
  console.log(`[Shopify Service Resolved Values] resolvedAmount: ${resolvedAmount}`);

  // Create new order in Prisma
  const newOrder = await prisma.order.create({
    data: {
      userId: resolvedUserId,
      shopifyOrderId,
      customer: resolvedCustomerName,
      phone: resolvedPhone,
      product: productTitle,
      amount: resolvedAmount,
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
