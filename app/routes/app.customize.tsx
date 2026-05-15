// FILE: app/routes/app.customize.tsx

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit, useNavigate } from "@remix-run/react";
import { useState } from "react";
import {
  Page, Layout, Card, BlockStack, TextField, Text, Banner, InlineStack,
  Box, RangeSlider, Modal, Button,
} from "@shopify/polaris";
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

  // ✅ No redirect — everyone can VIEW the full page
  return { shop, plan: shop.plan ?? "free" };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const data = JSON.parse(String(form.get("payload") || "{}"));

  // ✅ Server-side plan guard on actual save
  const shop = await db.shop.findUnique({ where: { shop: session.shop } });
  if (!shop?.plan || shop.plan === "free") {
    return json({ ok: false, upgradeRequired: true });
  }

  await db.shop.update({
    where: { shop: session.shop },
    data: {
      widgetTitle: data.widgetTitle || "Frequently bought together",
      widgetSubtitle: data.widgetSubtitle || null,
      widgetCtaLabel: data.widgetCtaLabel || "Add bundle to cart",
      widgetAccentColor: data.widgetAccentColor || "#000000",
      widgetTextColor: data.widgetTextColor || "#202020",
      widgetBorderRadius: Number(data.widgetBorderRadius) || 8,
      widgetFontFamily: data.widgetFontFamily || "inherit",
    },
  });
  return json({ ok: true, upgradeRequired: false });
};

export default function Customize() {
  const { shop, plan } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigate = useNavigate();

  const [title, setTitle] = useState(shop.widgetTitle);
  const [subtitle, setSubtitle] = useState(shop.widgetSubtitle ?? "");
  const [cta, setCta] = useState(shop.widgetCtaLabel);
  const [accent, setAccent] = useState(shop.widgetAccentColor);
  const [textColor, setTextColor] = useState(shop.widgetTextColor);
  const [radius, setRadius] = useState(shop.widgetBorderRadius);
  const [font, setFont] = useState(shop.widgetFontFamily);

  // ✅ Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const handleSave = () => {
    // ✅ Client-side check: show modal immediately for free plan
    if (plan === "free") {
      setShowUpgradeModal(true);
      return;
    }

    const fd = new FormData();
    fd.append(
      "payload",
      JSON.stringify({
        widgetTitle: title,
        widgetSubtitle: subtitle,
        widgetCtaLabel: cta,
        widgetAccentColor: accent,
        widgetTextColor: textColor,
        widgetBorderRadius: radius,
        widgetFontFamily: font,
      }),
    );
    submit(fd, { method: "post" });
  };

  // Also catch server-side upgradeRequired response (safety net)
  const isModalOpen = showUpgradeModal || actionData?.upgradeRequired === true;

  return (
    <Page
      title="Customize widget"
      primaryAction={{ content: "Save", onAction: handleSave }}
    >
      <TitleBar title="Customize widget" />

      {/* ✅ Upgrade popup — only triggers on Save click for free plan */}
      <Modal
        open={isModalOpen}
        onClose={() => setShowUpgradeModal(false)}
        title="Upgrade to save your customizations"
        primaryAction={{
          content: "View Plans →",
          onAction: () => navigate("/app/plans?reason=customize"),
        }}
        secondaryActions={[
          {
            content: "Maybe later",
            onAction: () => setShowUpgradeModal(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            {/* Hero gradient block */}
            <div
              style={{
                background: "linear-gradient(135deg, #1a1f6e, #4f6af0)",
                borderRadius: "12px",
                padding: "24px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "36px", marginBottom: "10px" }}>🎨</div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "17px",
                  color: "#fff",
                  marginBottom: "6px",
                }}
              >
                Widget Customization is a Paid Feature
              </div>
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>
                Upgrade to Basic or Advanced to save your widget's colors, fonts, text, and more.
              </div>
            </div>

            {/* Feature list */}
            <BlockStack gap="200">
              {[
                "Custom accent colors & button styling",
                "Font family & border radius control",
                "Widget title, subtitle & CTA label",
                "10 campaigns on Basic, unlimited on Advanced",
                "7-day free trial — no credit card required",
              ].map((f) => (
                <InlineStack key={f} gap="200" blockAlign="center">
                  <Text as="span" tone="success">✓</Text>
                  <Text as="span">{f}</Text>
                </InlineStack>
              ))}
            </BlockStack>
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* ✅ Success banner after save */}
      {actionData?.ok && (
        <Box paddingBlockEnd="400">
          <Banner tone="success" title="Saved successfully" />
        </Box>
      )}

      {/* ✅ Soft non-blocking hint for free plan users */}
      {plan === "free" && (
        <Box paddingBlockEnd="400">
          <Banner
            tone="info"
            title="Free Plan — you can preview changes but need to upgrade to save"
            action={{ content: "View Plans", url: "/app/plans" }}
          />
        </Box>
      )}

      <Layout>
        <Layout.Section>
          <BlockStack gap="400">

            {/* ── Text settings — visible to ALL plans ── */}
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingSm">Text</Text>
                <TextField
                  label="Default title"
                  value={title}
                  onChange={setTitle}
                  autoComplete="off"
                />
                <TextField
                  label="Default subtitle"
                  value={subtitle}
                  onChange={setSubtitle}
                  helpText="Supports {{discount}} and {{timer}}."
                  autoComplete="off"
                />
                <TextField
                  label="CTA button label"
                  value={cta}
                  onChange={setCta}
                  autoComplete="off"
                />
              </BlockStack>
            </Card>

            {/* ── Appearance settings — visible to ALL plans ── */}
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingSm">Appearance</Text>
                <InlineStack gap="300">
                  <Box minWidth="200px">
                    <TextField
                      label="Accent / button color"
                      value={accent}
                      onChange={setAccent}
                      autoComplete="off"
                    />
                  </Box>
                  <Box minWidth="200px">
                    <TextField
                      label="Text color"
                      value={textColor}
                      onChange={setTextColor}
                      autoComplete="off"
                    />
                  </Box>
                </InlineStack>
                <RangeSlider
                  label="Border radius (px)"
                  value={radius}
                  min={0}
                  max={24}
                  onChange={(v) => setRadius(Number(v))}
                />
                <TextField
                  label="Font family"
                  value={font}
                  onChange={setFont}
                  helpText="Use 'inherit' to match the theme."
                  autoComplete="off"
                />
              </BlockStack>
            </Card>

          </BlockStack>
        </Layout.Section>

        {/* ── Preview — visible to ALL plans ── */}
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">Preview</Text>
              <div
                style={{
                  border: "1px solid #e3e3e3",
                  borderRadius: radius,
                  padding: 16,
                  fontFamily: font,
                  color: textColor,
                  background: "#fff",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
                {subtitle && (
                  <div style={{ fontSize: 12, color: "#707070", marginTop: 2 }}>{subtitle}</div>
                )}
                <div
                  style={{
                    border: "1px solid #e3e3e3",
                    borderRadius: radius,
                    padding: 10,
                    margin: "10px 0",
                    fontSize: 13,
                  }}
                >
                  Product A — $25.00
                </div>
                <div
                  style={{
                    border: "1px solid #e3e3e3",
                    borderRadius: radius,
                    padding: 10,
                    margin: "10px 0",
                    fontSize: 13,
                  }}
                >
                  Product B — $15.00
                </div>
                <button
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: accent,
                    color: "#fff",
                    border: 0,
                    borderRadius: radius,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {cta}
                </button>
              </div>

              {/* ✅ Upgrade nudge button inside preview — only for free plan */}
              {plan === "free" && (
                <Box paddingBlockStart="300">
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    style={{
                      width: "100%",
                      padding: "11px",
                      background: "linear-gradient(135deg, #1a1f6e, #4f6af0)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: 700,
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    🔒 Upgrade to Save Changes
                  </button>
                </Box>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}