// app/billing.server.ts
// Handles Basic ($9.99/mo, 7-day trial) and Advanced ($9.99/mo) plans

import db from "./db.server";

/* ── Types ────────────────────────────────────────────────────────────────── */
export type PlanKey = "free" | "basic" | "advanced";

interface PlanConfig {
  name: string;
  amount: number;
  currencyCode: string;
  interval: string;
  trialDays: number;
}

interface CreateSubscriptionResult {
  confirmationUrl: string;
  subscriptionId: string;
}

/* ── Plan config ──────────────────────────────────────────────────────────── */
// "name" must match EXACTLY what you set in the Shopify Partner dashboard
export const PLAN_CONFIG: Record<Exclude<PlanKey, "free">, PlanConfig> = {
  basic: {
    name: "BASIC PLAN",       // ← Partner dashboard display name
    amount: 9.99,
    currencyCode: "USD",
    interval: "EVERY_30_DAYS",
    trialDays: 7,
  },
  advanced: {
    name: "ADVANCED PLAN",    // ← Partner dashboard display name
    amount: 9.99,
    currencyCode: "USD",
    interval: "EVERY_30_DAYS",
    trialDays: 0,
  },
};

/* ── isDevStore ───────────────────────────────────────────────────────────── */
export async function isDevStore(admin: any): Promise<boolean> {
  const response = await admin.graphql(`
    query {
      shop {
        plan {
          partnerDevelopment
        }
      }
    }
  `);
  const data = await response.json();
  return data?.data?.shop?.plan?.partnerDevelopment === true;
}

/* ── getShopPlan ──────────────────────────────────────────────────────────── */
export async function getShopPlan(shop: string) {
  let shopPlan = await db.shopPlan.findUnique({ where: { shop } });
  if (!shopPlan) {
    shopPlan = await db.shopPlan.create({
      data: { shop, plan: "free", status: "active" },
    });
  }
  return shopPlan;
}

/* ── createSubscription ───────────────────────────────────────────────────── */
export async function createSubscription(
  admin: any,
  shop: string,
  returnUrl: string,
  planKey: Exclude<PlanKey, "free"> = "advanced",
): Promise<CreateSubscriptionResult> {
  const config = PLAN_CONFIG[planKey];
  if (!config) throw new Error(`Unknown plan key: ${planKey}`);

  const mutation = `
    mutation AppSubscriptionCreate(
      $name: String!
      $returnUrl: URL!
      $lineItems: [AppSubscriptionLineItemInput!]!
      $trialDays: Int
      $test: Boolean
    ) {
      appSubscriptionCreate(
        name: $name
        returnUrl: $returnUrl
        lineItems: $lineItems
        trialDays: $trialDays
        test: $test
      ) {
        appSubscription {
          id
          status
        }
        confirmationUrl
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    name: config.name,
    returnUrl,
    lineItems: [
      {
        plan: {
          appRecurringPricingDetails: {
            price: { amount: config.amount, currencyCode: config.currencyCode },
            interval: config.interval,
          },
        },
      },
    ],
    trialDays: config.trialDays > 0 ? config.trialDays : null,
    test: process.env.NODE_ENV !== "production",
  };

  const response = await admin.graphql(mutation, { variables });
  const data = await response.json();

  const result = data?.data?.appSubscriptionCreate;
  if (result?.userErrors?.length) {
    console.error("[billing] userErrors:", result.userErrors);
    throw new Error(result.userErrors.map((e: { message: string }) => e.message).join(", "));
  }

  return {
    confirmationUrl: result.confirmationUrl,
    subscriptionId: result.appSubscription?.id,
  };
}

/* ── cancelSubscription ───────────────────────────────────────────────────── */
export async function cancelSubscription(admin: any, subscriptionId: string) {
  const mutation = `
    mutation AppSubscriptionCancel($id: ID!) {
      appSubscriptionCancel(id: $id) {
        appSubscription {
          id
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
  const response = await admin.graphql(mutation, {
    variables: { id: subscriptionId },
  });
  const data = await response.json();

  const result = data?.data?.appSubscriptionCancel;
  if (result?.userErrors?.length) {
    console.error("[billing] cancel userErrors:", result.userErrors);
  }
  return result?.appSubscription;
}

/* ── syncSubscriptionStatus ───────────────────────────────────────────────── */
export async function syncSubscriptionStatus(admin: any, shop: string): Promise<PlanKey> {
  const query = `
    query {
      currentAppInstallation {
        activeSubscriptions {
          id
          name
          status
          trialDays
          createdAt
        }
      }
    }
  `;

  const response = await admin.graphql(query);
  const data = await response.json();

  const subscriptions: Array<{
    id: string;
    name: string;
    status: string;
    trialDays: number;
    createdAt: string;
  }> = data?.data?.currentAppInstallation?.activeSubscriptions ?? [];

  const activeSub = subscriptions.find((s) => s.status === "ACTIVE");

  if (!activeSub) {
    await db.shopPlan.upsert({
      where: { shop },
      update: { plan: "free", subscriptionId: null, status: "active" },
      create: { shop, plan: "free", status: "active" },
    });
    return "free";
  }

  const planKey = resolvePlanKey(activeSub.name);

  await db.shopPlan.upsert({
    where: { shop },
    update: {
      plan: planKey,
      subscriptionId: activeSub.id,
      status: "active",
      billingStartedAt: new Date(activeSub.createdAt),
    },
    create: {
      shop,
      plan: planKey,
      subscriptionId: activeSub.id,
      status: "active",
      billingStartedAt: new Date(activeSub.createdAt),
    },
  });

  return planKey;
}

/* ── helpers ──────────────────────────────────────────────────────────────── */
function resolvePlanKey(subscriptionName: string): Exclude<PlanKey, "free"> {
  const name = subscriptionName?.toUpperCase() ?? "";
  if (name.includes("BASIC")) return "basic";
  if (name.includes("ADVANCED")) return "advanced";
  return "advanced";
}
