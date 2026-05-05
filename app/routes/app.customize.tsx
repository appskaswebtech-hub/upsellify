import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit } from "@remix-run/react";
import { useState } from "react";
import {
  Page, Layout, Card, BlockStack, TextField, Text, Banner, InlineStack, Box, RangeSlider,
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
  return { shop };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const data = JSON.parse(String(form.get("payload") || "{}"));
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
  return json({ ok: true });
};

export default function Customize() {
  const { shop } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();

  const [title, setTitle] = useState(shop.widgetTitle);
  const [subtitle, setSubtitle] = useState(shop.widgetSubtitle ?? "");
  const [cta, setCta] = useState(shop.widgetCtaLabel);
  const [accent, setAccent] = useState(shop.widgetAccentColor);
  const [textColor, setTextColor] = useState(shop.widgetTextColor);
  const [radius, setRadius] = useState(shop.widgetBorderRadius);
  const [font, setFont] = useState(shop.widgetFontFamily);

  const save = () => {
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

  return (
    <Page title="Customize widget" primaryAction={{ content: "Save", onAction: save }}>
      <TitleBar title="Customize widget" />
      {actionData?.ok && (
        <Box paddingBlockEnd="400">
          <Banner tone="success" title="Saved" />
        </Box>
      )}

      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingSm">Text</Text>
                <TextField label="Default title" value={title} onChange={setTitle} autoComplete="off" />
                <TextField label="Default subtitle" value={subtitle} onChange={setSubtitle} helpText="Supports {{discount}} and {{timer}}." autoComplete="off" />
                <TextField label="CTA button label" value={cta} onChange={setCta} autoComplete="off" />
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingSm">Appearance</Text>
                <InlineStack gap="300">
                  <Box minWidth="200px">
                    <TextField label="Accent / button color" value={accent} onChange={setAccent} autoComplete="off" />
                  </Box>
                  <Box minWidth="200px">
                    <TextField label="Text color" value={textColor} onChange={setTextColor} autoComplete="off" />
                  </Box>
                </InlineStack>
                <RangeSlider label="Border radius (px)" value={radius} min={0} max={24} onChange={(v) => setRadius(Number(v))} />
                <TextField label="Font family" value={font} onChange={setFont} helpText="Use 'inherit' to match the theme." autoComplete="off" />
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>

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
                <div style={{ border: "1px solid #e3e3e3", borderRadius: radius, padding: 10, margin: "10px 0", fontSize: 13 }}>
                  Product A — $25.00
                </div>
                <div style={{ border: "1px solid #e3e3e3", borderRadius: radius, padding: 10, margin: "10px 0", fontSize: 13 }}>
                  Product B — $15.00
                </div>
                <button
                  style={{
                    width: "100%", padding: "12px", background: accent, color: "#fff",
                    border: 0, borderRadius: radius, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  {cta}
                </button>
              </div>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
