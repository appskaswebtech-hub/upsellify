import { authenticate } from "../shopify.server";
import type { ActionFunctionArgs } from "@remix-run/node";

interface CustomerDataRequestPayload {
  customer: {
    id: number;
    email: string;
    phone?: string;
  };
  orders_requested?: number[];
  shop_id: number;
  shop_domain: string;
}

interface CustomerRedactPayload {
  customer: {
    id: number;
    email: string;
    phone?: string;
  };
  orders_to_redact?: number[];
  shop_id: number;
  shop_domain: string;
}

interface ShopRedactPayload {
  shop_id: number;
  shop_domain: string;
}

type WebhookPayload =
  | CustomerDataRequestPayload
  | CustomerRedactPayload
  | ShopRedactPayload;

export const action = async ({ request }: ActionFunctionArgs) => {
  console.log("🎯 Webhook received at:", new Date().toISOString());

  try {
    const { topic, shop, payload } = await authenticate.webhook(request);

    console.log("✅ HMAC verification passed");
    console.log(`✅ Topic: ${topic}`);
    console.log(`✅ Shop: ${shop}`);
    console.log(`✅ Payload:`, payload);

    switch (topic) {
      case "CUSTOMERS_DATA_REQUEST":
        console.log("📋 Processing customer data request");
        await handleCustomerDataRequest(
          payload as CustomerDataRequestPayload,
          shop
        );
        break;

      case "CUSTOMERS_REDACT":
        console.log("🗑️ Processing customer redaction");
        await handleCustomerRedact(payload as CustomerRedactPayload, shop);
        break;

      case "SHOP_REDACT":
        console.log("🗑️ Processing shop redaction");
        await handleShopRedact(payload as ShopRedactPayload, shop);
        break;

      default:
        console.log(`⚠️ Unhandled webhook topic: ${topic}`);
    }

    return new Response("Webhook processed successfully", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error) {
    const err = error as Error & { status?: number };

    console.error("❌ Webhook error:", err);
    console.error("Error details:", {
      message: err.message,
      name: err.name,
      stack: err.stack,
    });

    const isAuthError =
      err.message?.toLowerCase().includes("hmac") ||
      err.message?.toLowerCase().includes("unauthorized") ||
      err.message?.toLowerCase().includes("authentication") ||
      err.message?.toLowerCase().includes("invalid") ||
      err.status === 401;

    if (isAuthError) {
      console.log("❌ Returning 401 - HMAC verification failed");
      return new Response("Unauthorized - Invalid HMAC signature", {
        status: 401,
        headers: { "Content-Type": "text/plain" },
      });
    }

    console.log("❌ Returning 500 - Internal server error");
    return new Response("Internal Server Error", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
};

async function handleCustomerDataRequest(
  payload: CustomerDataRequestPayload,
  shop: string
): Promise<void> {
  console.log(`No customer data stored for shop: ${shop}`);
  // const customerData = await db.getCustomerData(payload.customer.id);
  // await sendDataToStoreOwner(shop, customerData);
}

async function handleCustomerRedact(
  payload: CustomerRedactPayload,
  shop: string
): Promise<void> {
  console.log(`No customer data to redact for shop: ${shop}`);
  // await db.deleteCustomerData(payload.customer.id);
  // await db.deleteOrderData(payload.orders_to_redact);
}

async function handleShopRedact(
  payload: ShopRedactPayload,
  shop: string
): Promise<void> {
  console.log(`Shop data redaction requested for: ${shop}`);
  // await db.deleteShopData(payload.shop_id);
  // await db.deleteAllSessions(shop);
}
