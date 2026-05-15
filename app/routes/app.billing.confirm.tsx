import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

const VALID_PLANS = ["basic", "advanced"] as const;

export async function loader({ request }: LoaderFunctionArgs) {
  const { billing, session } = await authenticate.admin(request);

  // Verify active subscription
  const billingCheck = await billing.check({
    plans: [...VALID_PLANS],
    isTest: true, // Remove in production
  });

  // No payment approved
  if (!billingCheck.hasActivePayment) {
    return redirect("/app/plans");
  }

  // Detect actual active plan from Shopify
  const subscriptions = billingCheck.appSubscriptions || [];

  let activePlan: "basic" | "advanced" = "basic";

  const hasAdvanced = subscriptions.some((sub) =>
    sub.name.toLowerCase().includes("advanced")
  );

  if (hasAdvanced) {
    activePlan = "advanced";
  }

  // Update DB safely
  await db.shop.upsert({
    where: { shop: session.shop },
    update: {
      plan: activePlan,
    },
    create: {
      shop: session.shop,
      plan: activePlan,
    },
  });

  return redirect("/app");
}