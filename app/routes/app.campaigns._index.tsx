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

const CAMPAIGN_LIMITS: Record<string, number> = {
  free: 1,
  basic: 10,
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

  // ✅ GET SHOP PLAN
  const shop = await db.shop.upsert({
    where: {
      shop: session.shop,
    },
    update: {},
    create: {
      shop: session.shop,
    },
  });

  return {
    campaigns,
    plan: shop.plan ?? "free",
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

  const limit = CAMPAIGN_LIMITS[plan];

  const totalCampaigns = campaigns.length;

  const canCreate = totalCampaigns < limit;

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
                  {totalCampaigns} / {
                    limit === Infinity
                      ? "Unlimited"
                      : limit
                  }
                </strong>
              </Text>
            </InlineStack>
          </Card>
        </Box>

        {!canCreate && (
          <Box paddingBlockEnd="400">
            <Banner
              tone="warning"
              title="Campaign limit reached"
              action={{
                content: "Upgrade Plan",
                onAction: () => navigate("/app/plans"),
              }}
            >
              <p>
                Your current plan has reached the maximum campaign limit.
                Upgrade your plan to create more campaigns.
              </p>
            </Banner>
          </Box>
        )}

        <Card>
          <EmptyState
            heading="Create your first campaign"
            action={{
              content: canCreate
                ? "Create campaign"
                : "Upgrade plan",
              onAction: () => {
                if (canCreate) {
                  navigate("/app/campaigns/new");
                } else {
                  navigate("/app/plans");
                }
              },
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
        content: canCreate
          ? "Create campaign"
          : "Upgrade plan",

        disabled: !canCreate,

        onAction: () => {
          if (canCreate) {
            navigate("/app/campaigns/new");
          } else {
            navigate("/app/plans");
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
                {totalCampaigns} / {
                  limit === Infinity
                    ? "Unlimited"
                    : limit
                }
              </strong>
            </Text>
          </InlineStack>

          {!canCreate && (
            <Box paddingBlockStart="300">
              <Text as="p" tone="critical">
                Campaign limit reached. Upgrade your plan to create more campaigns.
              </Text>
            </Box>
          )}
        </Card>
      </Box>

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