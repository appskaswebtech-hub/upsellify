import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

import {
  authenticate,
  BASIC_PLAN,
  ADVANCED_PLAN,
} from "../shopify.server";

const PLAN_MAP = {
  basic: BASIC_PLAN,
  advanced: ADVANCED_PLAN,
} as const;

type PlanKey = keyof typeof PLAN_MAP;

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);

  const selectedPlan = url.searchParams.get("plan") as PlanKey | null;

  // ❌ Invalid plan
  if (!selectedPlan || !(selectedPlan in PLAN_MAP)) {
    return redirect("/app/plans");
  }

  const { billing, session } = await authenticate.admin(request);

  // ✅ Get host safely
  const host = url.searchParams.get("host");

  if (!host || host === "null") {
  return redirect(`/app/plans?shop=${session.shop}`);
}

  // ✅ Build callback URL
  const returnUrl = new URL(
    "/app/billing/confirm",
    process.env.SHOPIFY_APP_URL
  );

  returnUrl.searchParams.set("shop", session.shop);
  returnUrl.searchParams.set("host", host);
  returnUrl.searchParams.set("plan", selectedPlan);

  console.log(
    `🚀 Billing request started | Shop: ${session.shop} | Plan: ${selectedPlan}`
  );

  // ✅ Redirects automatically to Shopify billing page
  await billing.request({
    plan: PLAN_MAP[selectedPlan],
    isTest: true, // remove in production
    returnUrl: returnUrl.toString(),
  });

  return null;
}