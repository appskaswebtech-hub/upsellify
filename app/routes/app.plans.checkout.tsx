import { type LoaderFunctionArgs, redirect } from "@remix-run/node";
import { authenticate, BASIC_PLAN, ADVANCED_PLAN } from "../shopify.server";

const PLAN_MAP = {
  basic: BASIC_PLAN,
  advanced: ADVANCED_PLAN,
} as const;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const plan = url.searchParams.get("plan") as keyof typeof PLAN_MAP;
  const host = url.searchParams.get("host");

  if (!plan || !(plan in PLAN_MAP)) {
    return redirect("/app/plans");
  }

  const { billing, session } = await authenticate.admin(request);

  const returnUrl = new URL(
    "/app/billing/confirm",
    process.env.SHOPIFY_APP_URL
  );
  returnUrl.searchParams.set("shop", session.shop);
  if (host) returnUrl.searchParams.set("host", host);
  returnUrl.searchParams.set("embedded", "1");

  const { confirmationUrl } = await billing.request({
    plan: PLAN_MAP[plan],
    isTest: true,
    returnUrl: returnUrl.toString(),
  });

  return redirect(confirmationUrl); // ✅ This is correct
};

export default function Checkout() {
  return <div>Loading...</div>;
}