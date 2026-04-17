import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useSubmit } from "@remix-run/react";
import { useState, useCallback } from "react";
import {
  Page, Layout, Card, BlockStack, InlineStack, TextField, Select, Button,
  Text, Badge, Thumbnail, Icon, Box, Banner,
} from "@shopify/polaris";
import { DeleteIcon, ViewIcon } from "@shopify/polaris-icons";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

type PickedProduct = {
  id: string;
  title: string;
  handle: string;
  image?: string;
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const campaign = await db.campaign.findFirst({
    where: { id: params.id, shop: session.shop, deletedAt: null },
    include: { triggers: true, offers: true },
  });
  if (!campaign) throw new Response("Not found", { status: 404 });
  return { campaign };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = form.get("intent");

  const campaign = await db.campaign.findFirst({
    where: { id: params.id, shop: session.shop, deletedAt: null },
  });
  if (!campaign) throw new Response("Not found", { status: 404 });

  if (intent === "delete") {
    await db.campaign.update({
      where: { id: campaign.id },
      data: { deletedAt: new Date() },
    });
    return redirect("/app/campaigns");
  }

  if (intent === "save") {
    const name = String(form.get("name") || "").trim() || "Untitled";
    const status = String(form.get("status") || "DRAFT");
    const title = String(form.get("title") || "") || null;
    const subtitle = String(form.get("subtitle") || "") || null;
    const priority = Number(form.get("priority") || 0);
    const triggers = JSON.parse(String(form.get("triggers") || "[]")) as PickedProduct[];
    const offers = JSON.parse(String(form.get("offers") || "[]")) as PickedProduct[];

    await db.$transaction([
      db.campaign.update({
        where: { id: campaign.id },
        data: { name, status, title, subtitle, priority },
      }),
      db.campaignTrigger.deleteMany({ where: { campaignId: campaign.id } }),
      db.campaignOffer.deleteMany({ where: { campaignId: campaign.id } }),
      db.campaignTrigger.createMany({
        data: triggers.map((p, i) => ({
          campaignId: campaign.id,
          resourceType: "product",
          resourceId: p.id,
          resourceTitle: p.title,
          resourceHandle: p.handle,
          imageUrl: p.image,
          position: i,
        })),
      }),
      db.campaignOffer.createMany({
        data: offers.map((p, i) => ({
          campaignId: campaign.id,
          productId: p.id,
          productTitle: p.title,
          productHandle: p.handle,
          imageUrl: p.image,
          position: i,
        })),
      }),
      db.shop.update({
        where: { shop: session.shop },
        data: { firstCampaignCreated: true },
      }),
    ]);

    return json({ ok: true });
  }

  return json({ ok: false });
};

export default function CampaignEditor() {
  const { campaign } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const shopify = useAppBridge();
  const submit = useSubmit();

  const [name, setName] = useState(campaign.name);
  const [status, setStatus] = useState(campaign.status);
  const [title, setTitle] = useState(campaign.title ?? "");
  const [subtitle, setSubtitle] = useState(campaign.subtitle ?? "");
  const [priority, setPriority] = useState(String(campaign.priority));
  const [triggers, setTriggers] = useState<PickedProduct[]>(
    campaign.triggers.map((t) => ({
      id: t.resourceId, title: t.resourceTitle, handle: t.resourceHandle ?? "", image: t.imageUrl ?? undefined,
    })),
  );
  const [offers, setOffers] = useState<PickedProduct[]>(
    campaign.offers.map((o) => ({
      id: o.productId, title: o.productTitle, handle: o.productHandle ?? "", image: o.imageUrl ?? undefined,
    })),
  );

  const pickProducts = useCallback(async (target: "trigger" | "offer") => {
    const selection = await shopify.resourcePicker({
      type: "product",
      multiple: true,
      action: "select",
    });
    if (!selection) return;
    const picked: PickedProduct[] = selection.map((p: any) => ({
      id: p.id,
      title: p.title,
      handle: p.handle,
      image: p.images?.[0]?.originalSrc,
    }));
    if (target === "trigger") setTriggers((prev) => dedupe([...prev, ...picked]));
    else setOffers((prev) => dedupe([...prev, ...picked]));
  }, [shopify]);

  const handleSave = () => {
    const fd = new FormData();
    fd.append("intent", "save");
    fd.append("name", name);
    fd.append("status", status);
    fd.append("title", title);
    fd.append("subtitle", subtitle);
    fd.append("priority", priority);
    fd.append("triggers", JSON.stringify(triggers));
    fd.append("offers", JSON.stringify(offers));
    submit(fd, { method: "post" });
  };

  const handleDelete = () => {
    const fd = new FormData();
    fd.append("intent", "delete");
    submit(fd, { method: "post" });
  };

  return (
    <Page
      backAction={{ content: "Campaigns", url: "/app/campaigns" }}
      title={`${campaign.type.replace(/_/g, " ")}`}
      titleMetadata={<Badge tone={status === "ACTIVE" ? "success" : "info"}>{status}</Badge>}
      primaryAction={{ content: "Save", onAction: handleSave }}
      secondaryActions={[{ content: "Delete", destructive: true, onAction: handleDelete }]}
    >
      <TitleBar title={campaign.name} />
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
                <TextField
                  label="Campaign name — for internal reference"
                  value={name}
                  onChange={setName}
                  autoComplete="off"
                />
                <Select
                  label="Status"
                  options={[
                    { label: "Draft", value: "DRAFT" },
                    { label: "Active", value: "ACTIVE" },
                    { label: "Paused", value: "PAUSED" },
                  ]}
                  value={status}
                  onChange={setStatus}
                />
              </BlockStack>
            </Card>

            <ProductListCard
              heading="Trigger"
              helpText="Select the products for which the offer is displayed on the product page."
              products={triggers}
              onAdd={() => pickProducts("trigger")}
              onRemove={(id) => setTriggers((p) => p.filter((x) => x.id !== id))}
            />

            <ProductListCard
              heading="Offers"
              helpText="The selected products will be offered as a bundle along with the trigger product."
              products={offers}
              onAdd={() => pickProducts("offer")}
              onRemove={(id) => setOffers((p) => p.filter((x) => x.id !== id))}
            />

            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingSm">Other settings</Text>
                <TextField
                  label="Campaign title"
                  value={title}
                  onChange={setTitle}
                  placeholder="Optional. Eg: People also bought"
                  helpText="This setting overrides the widget's default title."
                  autoComplete="off"
                />
                <TextField
                  label="Campaign sub-title"
                  value={subtitle}
                  onChange={setSubtitle}
                  placeholder="Optional. Eg: Flaunt your style with this recommended outfit"
                  autoComplete="off"
                />
                <TextField
                  label="Campaign priority"
                  type="number"
                  value={priority}
                  onChange={setPriority}
                  placeholder="Optional. Eg: 10"
                  helpText="When several campaigns match a trigger product, the app will display the campaign with the highest priority."
                  autoComplete="off"
                />
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">Customize appearance</Text>
              <Text as="p" tone="subdued">
                The styling, text, and translations can be customised from the widget settings.
              </Text>
              <Button url="/app/customize">Customize widget</Button>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function ProductListCard({
  heading, helpText, products, onAdd, onRemove,
}: {
  heading: string;
  helpText: string;
  products: PickedProduct[];
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Card>
      <BlockStack gap="300">
        <Text as="h3" variant="headingSm">{heading}</Text>
        <Text as="p" tone="subdued">{helpText}</Text>
        <InlineStack>
          <Button onClick={onAdd}>Browse products</Button>
        </InlineStack>

        <BlockStack gap="200">
          {products.map((p) => (
            <Box key={p.id} padding="300" background="bg-surface-secondary" borderRadius="200">
              <InlineStack align="space-between" blockAlign="center">
                <InlineStack gap="300" blockAlign="center">
                  {p.image && <Thumbnail source={p.image} alt={p.title} size="small" />}
                  <Text as="span">{p.title}</Text>
                </InlineStack>
                <InlineStack gap="200">
                  <Button icon={ViewIcon} variant="tertiary" accessibilityLabel="Preview" />
                  <Button
                    icon={DeleteIcon}
                    variant="tertiary"
                    onClick={() => onRemove(p.id)}
                    accessibilityLabel="Remove"
                  />
                </InlineStack>
              </InlineStack>
            </Box>
          ))}
        </BlockStack>
      </BlockStack>
    </Card>
  );
}

function dedupe(arr: PickedProduct[]): PickedProduct[] {
  const seen = new Set<string>();
  return arr.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}
