// app/routes/app.billing.tsx
// Two plans: Basic ($9.99/mo, 7-day trial) and Advanced ($9.99/mo)

import { useEffect } from "react";
import { useLoaderData, useNavigation, useFetcher } from "@remix-run/react";
import { redirect } from "react-router";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import type { PlanKey } from "../billing.server";
import {
  getShopPlan,
  createSubscription,
  cancelSubscription,
  syncSubscriptionStatus,
  isDevStore,
} from "../billing.server";

/* ── Required by React Router v7 in production ── */
export function headers() {
  return {};
}

export function ErrorBoundary() {
  return (
    <div style={{ fontFamily: "sans-serif", padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#dc2626" }}>
        Something went wrong on the billing page.
      </div>
    </div>
  );
}

/* ── Action response type ── */
type ActionData =
  | { confirmationUrl: string; error?: never }
  | { error: string; confirmationUrl?: never }
  | null;

/* ── Loader ── */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  await getShopPlan(session.shop);

  const dev = await isDevStore(admin);

  const url = new URL(request.url);
  const chargeId = url.searchParams.get("charge_id");
  if (chargeId) {
    await syncSubscriptionStatus(admin, session.shop);
  }

  const activePlan = await syncSubscriptionStatus(admin, session.shop);
  return { plan: activePlan, isDevStore: dev };
};

/* ── Action ── */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;
  const planName = formData.get("planName") as Exclude<PlanKey, "free">;

  console.log("[billing action] actionType:", actionType, "planName:", planName);

  if (actionType === "subscribe") {
    const appUrl = process.env.SHOPIFY_APP_URL?.replace(/\/$/, "");
    const apiKey = process.env.SHOPIFY_API_KEY;
    if (!appUrl) {
      return { error: "SHOPIFY_APP_URL is not set in .env" };
    }
    if (!apiKey) {
      return { error: "SHOPIFY_API_KEY is not set in .env" };
    }

    const storeName = session.shop.replace(".myshopify.com", "");
    const returnUrl = `https://admin.shopify.com/store/${storeName}/apps/${apiKey}/app/billing`;

    console.log("[billing] planName:", planName, "returnUrl:", returnUrl);

    try {
      const { confirmationUrl, subscriptionId } = await createSubscription(
        admin,
        session.shop,
        returnUrl,
        planName,
      );

      console.log("[billing] confirmationUrl:", confirmationUrl);

      await db.shopPlan.upsert({
        where: { shop: session.shop },
        update: { subscriptionId, status: "active" },
        create: {
          shop: session.shop,
          plan: planName,
          subscriptionId,
          status: "active",
        },
      });

      return { confirmationUrl };
    } catch (err) {
      console.error("[billing] createSubscription failed:", err);
      return {
        error:
          err instanceof Error
            ? err.message
            : "Failed to create subscription. Please try again.",
      };
    }
  }

  if (actionType === "cancel") {
    try {
      const shopPlan = await db.shopPlan.findUnique({
        where: { shop: session.shop },
      });
      if (shopPlan?.subscriptionId) {
        await cancelSubscription(admin, shopPlan.subscriptionId);
      }
      await db.shopPlan.update({
        where: { shop: session.shop },
        data: { plan: "free", subscriptionId: null, status: "active" },
      });
      return redirect("/app/billing");
    } catch (err) {
      console.error("[billing] cancelSubscription failed:", err);
      return {
        error:
          err instanceof Error
            ? err.message
            : "Failed to cancel subscription. Please try again.",
      };
    }
  }

  return { error: "Unknown action type." };
};

/* ── Plan definitions ── */
interface PlanDefinition {
  key: Exclude<PlanKey, "free">;
  price: number;
  trial: number | null;
  features: string[];
}

const PLANS: PlanDefinition[] = [
  {
    key: "basic",
    price: 9.99,
    trial: 7,
    features: [
      "Only 5 campaigns",
      "Analytics dashboard",
      "Unlimited upsells",
      "Priority 24/7 support",
    ],
  },
  {
    key: "advanced",
    price: 17.99,
    trial: null,
    features: [
      "Unlimited campaigns",
      "Analytics dashboard",
      "Unlimited upsells",
      "Priority 24/7 support",
    ],
  },
];

/* ── Page ── */
export default function BillingPage() {
  const { plan, isDevStore: devStore } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<ActionData>();
  const navigation = useNavigation();
  const isLoading = navigation.state !== "idle" || fetcher.state !== "idle";

  const currentPlan: PlanKey = plan ?? "free";

  // Redirect to Shopify's confirmation page when we get a confirmationUrl back.
  // Must be in useEffect, NOT during render.
  useEffect(() => {
    if (fetcher.data && "confirmationUrl" in fetcher.data && fetcher.data.confirmationUrl) {
      // Break out of the embedded iframe to Shopify admin
      if (window.top) {
        window.top.location.href = fetcher.data.confirmationUrl;
      } else {
        window.location.href = fetcher.data.confirmationUrl;
      }
    }
  }, [fetcher.data]);

  const handleSubscribe = (planKey: Exclude<PlanKey, "free">) => {
    const fd = new FormData();
    fd.append("actionType", "subscribe");
    fd.append("planName", planKey);
    fetcher.submit(fd, { method: "post" });
  };

  const handleCancel = () => {
    if (!confirm("Cancel your plan? You'll lose access to paid features.")) return;
    const fd = new FormData();
    fd.append("actionType", "cancel");
    fetcher.submit(fd, { method: "post" });
  };

  const errorMessage =
    fetcher.data && "error" in fetcher.data ? fetcher.data.error : null;

  return (
    <div
      style={{
        fontFamily: "'DM Sans','Segoe UI',sans-serif",
        background: "#f5f5f0",
        minHeight: "100vh",
        padding: "48px 28px",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f1623", margin: "0 0 8px" }}>
          Pricing
        </h1>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 28px" }}>
          Choose the plan that fits your store.
        </p>

        {devStore && (
          <div
            style={{
              background: "#eff6ff",
              border: "1px solid #93c5fd",
              borderRadius: 10,
              padding: "12px 18px",
              marginBottom: 16,
              fontSize: 13,
              color: "#1e40af",
              fontWeight: 600,
            }}
          >
            🛠️ Development store detected — charges will be created as <strong>test charges</strong> (no real payment).
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fca5a5",
              borderRadius: 10,
              padding: "12px 18px",
              marginBottom: 16,
              fontSize: 13,
              color: "#991b1b",
              fontWeight: 600,
            }}
          >
            ⚠️ {errorMessage}
          </div>
        )}

        {currentPlan !== "free" && (
          <div
            style={{
              background: "#ecfdf5",
              border: "1px solid #6ee7b7",
              borderRadius: 10,
              padding: "12px 18px",
              marginBottom: 24,
              fontSize: 13,
              color: "#065f46",
              fontWeight: 600,
            }}
          >
            ✅ You are currently on the{" "}
            <strong>{currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</strong> plan.
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 20,
            flexWrap: "wrap",
            marginBottom: 28,
            alignItems: "stretch",
          }}
        >
          {PLANS.map((p) => {
            const isCurrent = currentPlan === p.key;

            const action: PlanCardAction = isCurrent
              ? { label: "Cancel Plan", onClick: handleCancel, variant: "outline" }
              : {
                  label: p.key === "advanced" ? "Upgrade to Advanced" : "Switch to Basic",
                  onClick: () => handleSubscribe(p.key),
                  variant: "primary",
                };

            const badge = devStore ? "TEST CHARGE" : null;

            return (
              <PlanCard
                key={p.key}
                name={p.key.charAt(0).toUpperCase() + p.key.slice(1)}
                price={p.price}
                trial={p.trial}
                features={p.features}
                isCurrent={isCurrent}
                badge={badge}
                action={action}
                isLoading={isLoading}
              />
            );
          })}
        </div>

        <p style={{ fontSize: 13, color: "#6b7280" }}>
          All charges are billed in USD. Recurring and usage-based charges are billed every 30 days.
        </p>
      </div>
    </div>
  );
}

/* ── Plan Card ── */
interface PlanCardAction {
  label: string;
  onClick: () => void;
  variant: "primary" | "outline";
}

interface PlanCardProps {
  name: string;
  price: number;
  trial: number | null;
  features: string[];
  isCurrent: boolean;
  badge: string | null;
  action: PlanCardAction;
  isLoading: boolean;
}

function PlanCard({
  name,
  price,
  trial,
  features,
  isCurrent,
  badge,
  action,
  isLoading,
}: PlanCardProps) {
  return (
    <div
      style={{
        flex: "1 1 300px",
        background: "#fff",
        borderRadius: 14,
        border: `1px solid ${isCurrent ? "#111827" : "#e8e8e4"}`,
        padding: "28px 24px",
        boxShadow: isCurrent ? "0 0 0 2px #111827" : "0 1px 4px rgba(0,0,0,.06)",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {isCurrent && !badge && (
        <span
          style={{
            position: "absolute",
            top: -11,
            left: 20,
            background: "#111827",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            borderRadius: 20,
            padding: "3px 12px",
            letterSpacing: ".04em",
          }}
        >
          CURRENT PLAN
        </span>
      )}
      {badge && (
        <span
          style={{
            position: "absolute",
            top: -11,
            left: 20,
            background: "#1d4ed8",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            borderRadius: 20,
            padding: "3px 12px",
            letterSpacing: ".04em",
          }}
        >
          {badge}
        </span>
      )}

      <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}>{name}</div>
      <div style={{ fontSize: 36, fontWeight: 800, color: "#0f1623", lineHeight: 1.1 }}>
        ${price.toFixed(2)}
        <span style={{ fontSize: 14, fontWeight: 500, color: "#6b7280" }}> / month</span>
      </div>

      {trial ? (
        <div
          style={{
            fontSize: 12,
            color: "#059669",
            fontWeight: 600,
            marginTop: 4,
            marginBottom: 20,
          }}
        >
          🎉 {trial}-day free trial
        </div>
      ) : (
        <div style={{ marginBottom: 24 }} />
      )}

      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f1623", marginBottom: 10 }}>
        Features
      </div>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: "0 0 24px",
          display: "flex",
          flexDirection: "column",
          gap: 7,
          flex: 1,
        }}
      >
        {features.map((f, i) => (
          <li
            key={i}
            style={{
              fontSize: 13,
              color: "#374151",
              display: "flex",
              alignItems: "flex-start",
              gap: 7,
            }}
          >
            <span style={{ color: "#111827", fontWeight: 700, flexShrink: 0 }}>✓</span>
            {f}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={action.onClick}
        disabled={isLoading}
        style={{
          width: "100%",
          border: action.variant === "primary" ? "none" : "1.5px solid #111827",
          borderRadius: 9,
          padding: "10px 0",
          fontSize: 13,
          fontWeight: 700,
          cursor: isLoading ? "wait" : "pointer",
          background: action.variant === "primary" ? "#111827" : "#fff",
          color: action.variant === "primary" ? "#fff" : "#111827",
          transition: "opacity .15s",
          opacity: isLoading ? 0.6 : 1,
        }}
      >
        {isLoading ? "Please wait…" : action.label}
      </button>
    </div>
  );
}
