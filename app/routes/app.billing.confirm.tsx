import { type LoaderFunctionArgs, redirect } from "@remix-run/node";
import { useNavigate, useLoaderData } from "@remix-run/react";
import { useEffect } from "react";
import { authenticate, BASIC_PLAN, ADVANCED_PLAN } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing } = await authenticate.admin(request);

  const billingCheck = await billing.require({
    plans: [BASIC_PLAN, ADVANCED_PLAN],
    onFailure: async () => redirect("/app/plans"),
  });

  const activePlan = billingCheck?.appSubscriptions?.[0]?.name || "basic";

  return { plan: activePlan };
};

export default function BillingCallback() {
  const { plan } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/app", { replace: true });
    }, 1000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ textAlign: "center", padding: "40px" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>✓</div>
        <h1 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "8px" }}>Payment Successful!</h1>
        <p style={{ fontSize: "14px", color: "#666" }}>You're on the {plan} plan</p>
        <p style={{ fontSize: "12px", color: "#999", marginTop: "16px" }}>Redirecting...</p>
      </div>
    </div>
  );
}