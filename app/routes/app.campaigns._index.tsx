import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";

import {
  Page,
  Card,
  IndexTable,
  Text,
  Badge,
  EmptyState,
  Box,
  InlineStack,
  Banner,
} from "@shopify/polaris";

import { TitleBar } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import db from "../db.server";

// =========================
// CAMPAIGN LIMITS
// =========================
// free     → 1 campaign
// basic    → 5 campaigns
// advanced → unlimited

const CAMPAIGN_LIMITS: Record<string, number> = {
  free: 1,
  basic: 5,
  advanced: Infinity,
};

// =========================
// LOADER
// =========================

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  // ✅ GET CAMPAIGNS
  const campaigns = await db.campaign.findMany({
    where: {
      shop: session.shop,
      deletedAt: null,
    },
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      _count: {
        select: {
          triggers: true,
          offers: true,
        },
      },
      discount: true,
    },
  });

  // ✅ GET SHOP PLAN (from ShopPlan model)
  const shopPlan = await db.shopPlan.upsert({
    where: {
      shop: session.shop,
    },
    update: {},
    create: {
      shop: session.shop,
      plan: "free",
      status: "active",
    },
  });

  // If the plan is not active (cancelled/expired), fall back to free limits
  const effectivePlan =
    shopPlan.status === "active" ? shopPlan.plan : "free";

  return {
    campaigns,
    plan: effectivePlan,
    rawPlan: shopPlan.plan,
    status: shopPlan.status,
  };
};

// =========================
// COMPONENT
// =========================

export default function Campaigns() {
  const { campaigns, plan } = useLoaderData<typeof loader>();

  const navigate = useNavigate();

  // =========================
  // LIMITS
  // =========================

  // Defensive fallback: if an unknown plan slips in, treat as free
  const limit = CAMPAIGN_LIMITS[plan] ?? CAMPAIGN_LIMITS.free;

  const totalCampaigns = campaigns.length;

  const canCreate = totalCampaigns < limit;

  const limitLabel = limit === Infinity ? "Unlimited" : limit;

  // =========================
  // EMPTY STATE
  // =========================

  if (campaigns.length === 0) {
    return (
      <Page>
        <TitleBar title="Campaigns" />

        <Box paddingBlockEnd="400">
          <Card>
            <InlineStack align="space-between">
              <Text as="p" variant="bodyMd">
                Current Plan:{" "}
                <strong style={{ textTransform: "capitalize" }}>
                  {plan}
                </strong>
              </Text>

              <Text as="p" variant="bodyMd">
                Campaign Usage:{" "}
                <strong>
                  {totalCampaigns} / {limitLabel}
                </strong>
              </Text>
            </InlineStack>
          </Card>
        </Box>

        <Card>
          <EmptyState
            heading="Create your first campaign"
            action={{
              content: "Create campaign",
              onAction: () => navigate("/app/campaigns/new"),
            }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>
              Bundle products together and boost average order value.
            </p>
          </EmptyState>
        </Card>
      </Page>
    );
  }

  // =========================
  // MAIN PAGE
  // =========================

  return (
    <Page
      title="Campaigns"
      primaryAction={{
        content: canCreate ? "Create campaign" : "Upgrade plan",
        disabled: false,
        onAction: () => {
          if (canCreate) {
            navigate("/app/campaigns/new");
          } else {
            navigate("/app/billing");
          }
        },
      }}
    >
      <TitleBar title="Campaigns" />

      {/* ========================= */}
      {/* PLAN STATUS */}
      {/* ========================= */}

      <Box paddingBlockEnd="400">
        <Card>
          <InlineStack align="space-between">
            <Text as="p" variant="bodyMd">
              Current Plan:{" "}
              <strong style={{ textTransform: "capitalize" }}>
                {plan}
              </strong>
            </Text>

            <Text as="p" variant="bodyMd">
              Campaign Usage:{" "}
              <strong>
                {totalCampaigns} / {limitLabel}
              </strong>
            </Text>
          </InlineStack>
        </Card>
      </Box>

      {/* ========================= */}
      {/* LIMIT REACHED BANNER */}
      {/* ========================= */}

      {!canCreate && (
        <Box paddingBlockEnd="400">
          <Banner
            tone="warning"
            title={
              plan === "free"
                ? "You've used your free campaign"
                : "Campaign limit reached"
            }
            action={{
              content:
                plan === "advanced"
                  ? "Contact support"
                  : "Upgrade plan",
              onAction: () => navigate("/app/billing"),
            }}
          >
            <p>
              {plan === "free" &&
                "The Free plan includes 1 campaign. Upgrade to Basic for 5 campaigns or Advanced for unlimited."}
              {plan === "basic" &&
                "The Basic plan includes 5 campaigns. Upgrade to Advanced for unlimited campaigns."}
              {plan === "advanced" &&
                "You've reached an unexpected limit on the Advanced plan."}
            </p>
          </Banner>
        </Box>
      )}

      {/* ========================= */}
      {/* TABLE */}
      {/* ========================= */}

      <Card padding="0">
        <IndexTable
          itemCount={campaigns.length}
          selectable={false}
          headings={[
            { title: "Name" },
            { title: "Type" },
            { title: "Status" },
            { title: "Discount" },
            { title: "Triggers" },
            { title: "Offers" },
          ]}
        >
          {campaigns.map((c, i) => (
            <IndexTable.Row
              id={c.id}
              key={c.id}
              position={i}
              onClick={() => navigate(`/app/campaigns/${c.id}`)}
            >
              <IndexTable.Cell>
                <Text
                  as="span"
                  fontWeight="semibold"
                  variant="bodyMd"
                >
                  {c.name}
                </Text>
              </IndexTable.Cell>

              <IndexTable.Cell>
                <Text as="span" tone="subdued">
                  {prettyType(c.type)}
                </Text>
              </IndexTable.Cell>

              <IndexTable.Cell>
                <Badge tone={statusTone(c.status)}>
                  {c.status}
                </Badge>
              </IndexTable.Cell>

              <IndexTable.Cell>
                {c.discount && c.discount.type !== "NONE" ? (
                  <Badge tone="attention">
                    {prettyDiscount(c.discount)}
                  </Badge>
                ) : (
                  <Text as="span" tone="subdued">
                    —
                  </Text>
                )}
              </IndexTable.Cell>

              <IndexTable.Cell>
                <Text as="span">
                  {c._count.triggers}
                </Text>
              </IndexTable.Cell>

              <IndexTable.Cell>
                <Text as="span">
                  {c._count.offers}
                </Text>
              </IndexTable.Cell>
            </IndexTable.Row>
          ))}
        </IndexTable>
      </Card>
    </Page>
  );
}

// =========================
// HELPERS
// =========================

function prettyType(t: string) {
  return t
    .replace("FBT_", "FBT · ")
    .replace(/_/g, " ");
}

function statusTone(
  status: string,
): "success" | "info" | "attention" | "warning" {
  switch (status) {
    case "ACTIVE":
      return "success";

    case "SCHEDULED":
      return "attention";

    case "PAUSED":
      return "warning";

    case "EXPIRED":
      return "warning";

    default:
      return "info";
  }
}

function prettyDiscount(
  d: {
    type: string;
    value: number | null;
  },
) {
  if (d.type === "PERCENTAGE") {
    return `${d.value}% off`;
  }

  if (d.type === "FIXED") {
    return `$${d.value} off`;
  }

  if (d.type === "TIERED") {
    return "Tiered";
  }

  return "—";
}
