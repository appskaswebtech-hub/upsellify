import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page, Layout, Card, BlockStack, InlineStack,
  Text, Button, Badge, Icon, Box,
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
    plan: shop.plan ?? "free", // ✅ Step 1: plan ko loader se return karo
  };
};

export default function Index() {
  // ✅ Step 2: plan ko destructure karo
  const { shop, campaignCount, shopDomain, plan } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

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

  // ✅ Step 3: condition ab kaam karegi kyunki plan available hai
  const isFreePlan    = plan === "free";
  const isBasicPlan   = plan === "basic";
  const isAdvancedPlan = plan === "advanced";

  return (
    <Page>
      <TitleBar title="Dashboard" />

      {/* ✅ Condition: Free plan walo ko upgrade banner dikhao */}
      {isFreePlan && (
        <div style={{
          background: "linear-gradient(135deg, #1a1f6e, #4f6af0)",
          borderRadius: "12px",
          padding: "20px 24px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "15px", color: "#fff", marginBottom: "4px" }}>
              🚀 You're on the Free Plan
            </div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.75)" }}>
              Upgrade to unlock campaigns, analytics & more.
            </div>
          </div>
          <button
            onClick={() => navigate("/app/plans")}
            style={{
              background: "#ffffff",
              color: "#1a2fb8",
              border: "none",
              borderRadius: "8px",
              padding: "10px 20px",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "13px",
              whiteSpace: "nowrap",
            }}
          >
            View Plans →
          </button>
        </div>
      )}

      {/* ✅ Condition: Basic plan walo ko advanced upgrade hint dikhao */}
      {isBasicPlan && (
        <div style={{
          background: "linear-gradient(135deg, #fef3c7, #fde68a)",
          border: "1px solid #f59e0b",
          borderRadius: "12px",
          padding: "14px 20px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}>
          <div style={{ fontSize: "13.5px", color: "#92400e", fontWeight: 600 }}>
            ⭐ Upgrade to Advanced for unlimited campaigns & priority support
          </div>
          <button
            onClick={() => navigate("/app/plans")}
            style={{
              background: "#f59e0b",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "8px 16px",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "12.5px",
            }}
          >
            Upgrade →
          </button>
        </div>
      )}

      {/* ✅ Condition: Advanced plan walo ko appreciation dikhao */}
      {isAdvancedPlan && (
        <div style={{
          background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
          border: "1px solid #86efac",
          borderRadius: "12px",
          padding: "14px 20px",
          marginBottom: "20px",
        }}>
          <div style={{ fontSize: "13.5px", color: "#166534", fontWeight: 600 }}>
            ✅ Advanced Plan Active — You have access to all features!
          </div>
        </div>
      )}

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
              <Text as="h2" variant="headingMd">
                Get started with your first upsell campaign!
              </Text>
              <Text as="p" tone="subdued">
                Create bundles, add-ons, and upsells across cart, checkout, and
                post-purchase pages — in just a few steps.
              </Text>
              <InlineStack>
                {/* ✅ Condition: Free plan hai to button disabled karo */}
                {isFreePlan ? (
                  <Button disabled>
                    Upgrade to create campaigns
                  </Button>
                ) : (
                  <Button url="/app/campaigns/new" variant="primary">
                    Create your first campaign
                  </Button>
                )}
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}