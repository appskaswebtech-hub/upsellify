import type { LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import {
  Page, Layout, Card, BlockStack, InlineStack, Text, Button, Badge, Icon, Box,
} from "@shopify/polaris";
import { CheckCircleIcon, InfoIcon } from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shop = await db.shop.upsert({
    where: { shop: session.shop },
    update: {},
    create: { shop: session.shop },
  });

  const campaignCount = await db.campaign.count({
    where: { shop: session.shop, deletedAt: null },
  });

  return {
    shop,
    campaignCount,
    shopDomain: session.shop,
  };
};

export default function Index() {
  const { shop, campaignCount, shopDomain } = useLoaderData<typeof loader>();

  const steps = [
    {
      key: "embed",
      title: "Activate the app embed",
      description: "Enable the Selleasy app embed in your theme editor.",
      done: shop.embedEnabled,
      cta: (
        <Button
          url={`https://${shopDomain}/admin/themes/current/editor?context=apps`}
          target="_top"
          variant="primary"
        >
          Enable app embed
        </Button>
      ),
    },
    {
      key: "campaign",
      title: "Create your first campaign",
      description: "Launch a Frequently Bought Together bundle.",
      done: campaignCount > 0,
      cta: (
        <Button url="/app/campaigns/new" variant="primary">
          Create campaign
        </Button>
      ),
    },
    {
      key: "verify",
      title: "Verify your store setup",
      description: "Test that the widget shows on a product page.",
      done: shop.storeVerified,
      cta: <Button url="/app/campaigns">Test in store</Button>,
    },
  ];

  const completed = steps.filter((s) => s.done).length;

  return (
    <Page>
      <TitleBar title="Dashboard" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">Getting started checklist</Text>
                <Badge tone={completed === steps.length ? "success" : "attention"}>
                  {`${completed} of ${steps.length} steps completed`}
                </Badge>
              </InlineStack>
              <Text as="p" tone="subdued">
                Complete these steps to finish your setup and start running campaigns.
              </Text>

              <BlockStack gap="300">
                {steps.map((step) => (
                  <Box
                    key={step.key}
                    padding="400"
                    background="bg-surface-secondary"
                    borderRadius="200"
                  >
                    <InlineStack gap="400" align="space-between" blockAlign="center">
                      <InlineStack gap="300" blockAlign="center">
                        <Icon
                            source={step.done ? CheckCircleIcon : InfoIcon}
                            tone={step.done ? "success" : "subdued"}
                          />
                        <BlockStack gap="100">
                          <Text as="h3" variant="headingSm">{step.title}</Text>
                          <Text as="p" tone="subdued">{step.description}</Text>
                        </BlockStack>
                      </InlineStack>
                      {!step.done && step.cta}
                    </InlineStack>
                  </Box>
                ))}
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Get started with your first upsell campaign!</Text>
              <Text as="p" tone="subdued">
                Create bundles, add-ons, and upsells across cart, checkout, and post-purchase pages — in just a few steps.
              </Text>
              <InlineStack>
                <Button url="/app/campaigns/new" variant="primary">
                  Create your first campaign
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
