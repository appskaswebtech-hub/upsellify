import type { LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import {
  Page, Card, IndexTable, Text, Badge, Button, EmptyState, BlockStack,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const campaigns = await db.campaign.findMany({
    where: { shop: session.shop, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { triggers: true, offers: true } } },
  });
  return { campaigns };
};

export default function Campaigns() {
  const { campaigns } = useLoaderData<typeof loader>();

  if (campaigns.length === 0) {
    return (
      <Page>
        <TitleBar title="Campaigns" />
        <Card>
          <EmptyState
            heading="Create your first campaign"
            action={{ content: "Create campaign", url: "/app/campaigns/new" }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>Bundle products together and boost average order value.</p>
          </EmptyState>
        </Card>
      </Page>
    );
  }

  return (
    <Page>
      <TitleBar title="Campaigns">
        <button variant="primary" onClick={() => (window.location.href = "/app/campaigns/new")}>
          Create campaign
        </button>
      </TitleBar>
      <Card padding="0">
        <IndexTable
          itemCount={campaigns.length}
          headings={[
            { title: "Name" },
            { title: "Type" },
            { title: "Status" },
            { title: "Triggers" },
            { title: "Offers" },
          ]}
          selectable={false}
        >
          {campaigns.map((c, i) => (
            <IndexTable.Row id={c.id} key={c.id} position={i}>
              <IndexTable.Cell>
                <Link to={`/app/campaigns/${c.id}`}>
                  <Text as="span" fontWeight="medium">{c.name}</Text>
                </Link>
              </IndexTable.Cell>
              <IndexTable.Cell>{c.type.replace(/_/g, " ")}</IndexTable.Cell>
              <IndexTable.Cell>
                <Badge tone={c.status === "ACTIVE" ? "success" : "info"}>{c.status}</Badge>
              </IndexTable.Cell>
              <IndexTable.Cell>{c._count.triggers}</IndexTable.Cell>
              <IndexTable.Cell>{c._count.offers}</IndexTable.Cell>
            </IndexTable.Row>
          ))}
        </IndexTable>
      </Card>
    </Page>
  );
}
