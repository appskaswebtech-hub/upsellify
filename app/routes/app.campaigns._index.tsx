import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page, Card, IndexTable, Text, Badge, EmptyState, Box, InlineStack, Thumbnail,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const campaigns = await db.campaign.findMany({
    where: { shop: session.shop, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { triggers: true, offers: true } },
      discount: true,
    },
  });
  return { campaigns };
};

export default function Campaigns() {
  const { campaigns } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  // Empty state
  if (campaigns.length === 0) {
    return (
      <Page>
        <TitleBar title="Campaigns" />
        <Card>
          <EmptyState
            heading="Create your first campaign"
            action={{
              content: "Create campaign",
              onAction: () => navigate("/app/campaigns/new"),
            }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>Bundle products together and boost average order value.</p>
          </EmptyState>
        </Card>
      </Page>
    );
  }

  return (
    <Page
      title="Campaigns"
      primaryAction={{
        content: "Create campaign",
        onAction: () => navigate("/app/campaigns/new"),
      }}
    >
      <TitleBar title="Campaigns" />
      <Card padding="0">
        <IndexTable
          itemCount={campaigns.length}
          headings={[
            { title: "Name" },
            { title: "Type" },
            { title: "Status" },
            { title: "Discount" },
            { title: "Triggers" },
            { title: "Offers" },
          ]}
          selectable={false}
        >
          {campaigns.map((c, i) => (
            <IndexTable.Row
              id={c.id}
              key={c.id}
              position={i}
              onClick={() => navigate(`/app/campaigns/${c.id}`)}
            >
              <IndexTable.Cell>
                <Text as="span" fontWeight="semibold" variant="bodyMd">
                  {c.name}
                </Text>
              </IndexTable.Cell>
              <IndexTable.Cell>
                <Text as="span" tone="subdued">
                  {prettyType(c.type)}
                </Text>
              </IndexTable.Cell>
              <IndexTable.Cell>
                <Badge tone={statusTone(c.status)}>{c.status}</Badge>
              </IndexTable.Cell>
              <IndexTable.Cell>
                {c.discount && c.discount.type !== "NONE" ? (
                  <Badge tone="attention">{prettyDiscount(c.discount)}</Badge>
                ) : (
                  <Text as="span" tone="subdued">—</Text>
                )}
              </IndexTable.Cell>
              <IndexTable.Cell>
                <Text as="span">{c._count.triggers}</Text>
              </IndexTable.Cell>
              <IndexTable.Cell>
                <Text as="span">{c._count.offers}</Text>
              </IndexTable.Cell>
            </IndexTable.Row>
          ))}
        </IndexTable>
      </Card>
    </Page>
  );
}

function prettyType(t: string) {
  return t.replace("FBT_", "FBT · ").replace(/_/g, " ");
}

function statusTone(status: string): "success" | "info" | "attention" | "warning" {
  switch (status) {
    case "ACTIVE": return "success";
    case "SCHEDULED": return "attention";
    case "PAUSED": return "warning";
    case "EXPIRED": return "warning";
    default: return "info";
  }
}

function prettyDiscount(d: { type: string; value: number | null }) {
  if (d.type === "PERCENTAGE") return `${d.value}% off`;
  if (d.type === "FIXED") return `$${d.value} off`;
  if (d.type === "TIERED") return "Tiered";
  return "—";
}
