import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";

const VALID_PLANS = ["basic", "advanced"] as const;
type PlanKey = (typeof VALID_PLANS)[number];

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);

  const selectedPlan = url.searchParams.get("plan") as PlanKey | null;

  // Invalid plan → back to plans page
  if (!selectedPlan || !VALID_PLANS.includes(selectedPlan)) {
    return redirect("/app/plans");
  }

  const { billing, session } = await authenticate.admin(request);

  // Get host from current URL
  const host = url.searchParams.get("host");

  // If host missing, redirect back safely instead of crashing
  if (!host) {
    return redirect(`/app/plans?shop=${session.shop}`);
  }

  // Build return URL properly
  const returnUrl = new URL(
    "/app/billing/confirm",
    process.env.SHOPIFY_APP_URL
  );

  returnUrl.searchParams.set("plan", selectedPlan);
  returnUrl.searchParams.set("shop", session.shop);
  returnUrl.searchParams.set("host", host);

  await billing.request({
    plan: selectedPlan,
    isTest: true, // Remove in production
    returnUrl: returnUrl.toString(),
  });

  return null;
}