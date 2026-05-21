import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

import {
  authenticate,
  BASIC_PLAN,
  ADVANCED_PLAN,
} from "../shopify.server";

import db from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { billing, session } = await authenticate.admin(request);

  // ✅ Verify subscription from Shopify
  const billingCheck = await billing.check({
    plans: [BASIC_PLAN, ADVANCED_PLAN],
    isTest: true, // remove in production
  });

  // ❌ No active payment
  if (!billingCheck.hasActivePayment) {
    return redirect("/app/plans");
  }

  // ✅ Get active subscriptions
  const subscriptions = billingCheck.appSubscriptions || [];

  // Default plan
  let activePlan = "basic";

  // Detect advanced plan
  const hasAdvanced = subscriptions.some((sub) =>
    sub.name.toLowerCase().includes("advanced")
  );

  if (hasAdvanced) {
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