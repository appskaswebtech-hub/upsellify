// app/routes/app.billing.webhook.tsx
// Register in shopify.app.toml:
// [[webhooks.subscriptions]]
// topics = ["app_subscriptions/update"]
// uri = "/app/billing/webhook"

import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import type { PlanKey } from "../billing.server";

function resolvePlanKey(subscriptionName: string): Exclude<PlanKey, "free"> {
  const name = subscriptionName?.toUpperCase() ?? "";
  if (name.includes("BASIC")) return "basic";
  if (name.includes("ADVANCED")) return "advanced";
  return "advanced"; // legacy fallback
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  if (topic === "APP_SUBSCRIPTIONS_UPDATE") {
    const sub = payload?.app_subscription as
      | { status: string; admin_graphql_api_id: string; name: string }
      | undefined;

    if (!sub) return new Response("ok", { status: 200 });

    const status = sub.status?.toLowerCase(); // active | cancelled | expired | declined
    const subscriptionId = sub.admin_graphql_api_id;
    const planKey = resolvePlanKey(sub.name);

    if (status === "active") {
      await db.shopPlan.upsert({
        where: { shop },
        update: { plan: planKey, subscriptionId, status: "active", billingStartedAt: new Date() },
        create: { shop, plan: planKey, subscriptionId, status: "active", billingStartedAt: new Date() },
      });
    } else {
      await db.shopPlan.upsert({
        where: { shop },
        update: {
          plan: "free",
          subscriptionId: null,
          status: status === "cancelled" ? "cancelled" : "expired",
        },
        create: { shop, plan: "free", status: "active" },
      });
    }
  }

  return new Response("ok", { status: 200 });
};
