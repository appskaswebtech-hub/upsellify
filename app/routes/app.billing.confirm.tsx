import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

import {
  authenticate,
  BASIC_PLAN,
  ADVANCED_PLAN,
} from "../shopify.server";

import db from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  // ✅ Authenticate admin
  const { billing, session } = await authenticate.admin(request);

  // ✅ Verify subscription from Shopify
  const billingCheck = await billing.check({
    plans: [BASIC_PLAN, ADVANCED_PLAN],
    isTest: true, // remove in production
  });

  console.log("✅ Billing Check:", billingCheck);

  // ❌ No active payment
  if (!billingCheck.hasActivePayment) {
    console.log("❌ No active subscription found");

    return redirect("/app/plans");
  }

  // ✅ Get active subscriptions
  const subscriptions = billingCheck.appSubscriptions || [];

  console.log("✅ Active Subscriptions:", subscriptions);

  // ✅ Default plan
  let activePlan: "basic" | "advanced" = "basic";

  // ✅ Get current subscription
  const activeSubscription = subscriptions[0];

  // ✅ Detect advanced plan
  if (activeSubscription?.name === ADVANCED_PLAN) {
    activePlan = "advanced";
  }

  // ✅ Save/update DB
  await db.shop.upsert({
    where: {
      shop: session.shop,
    },

    update: {
      plan: activePlan,
    },

    create: {
      shop: session.shop,
      plan: activePlan,
    },
  });

  console.log(
    `✅ Subscription synced | Shop: ${session.shop} | Plan: ${activePlan}`
  );

  // ✅ Redirect after successful verification
  return redirect("/app");
}