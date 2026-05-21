import { type LoaderFunctionArgs, redirect } from "@remix-run/node";
import { authenticate, BASIC_PLAN, ADVANCED_PLAN } from "../shopify.server";

const PLAN_MAP = {
  basic: BASIC_PLAN,
  advanced: ADVANCED_PLAN,
} as const;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const plan = url.searchParams.get("plan") as keyof typeof PLAN_MAP;

  if (!plan || !(plan in PLAN_MAP)) {
    return redirect("/app/plans");
  }

  const { billing } = await authenticate.admin(request);

  await billing.request({
    plan: PLAN_MAP[plan],
    isTest: true,
  });
};

export default function Checkout() {
  return <div>Loading...</div>;
}