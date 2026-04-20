import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit } from "@remix-run/react";
import { useState, useCallback } from "react";
import {
  Page, Layout, Card, BlockStack, InlineStack, TextField, Select, Button,
  Text, Badge, Thumbnail, Box, Banner, Checkbox, RadioButton, Divider,
  ButtonGroup, Tabs,
} from "@shopify/polaris";
import { DeleteIcon } from "@shopify/polaris-icons";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

type PickedResource = {
  id: string;
  title: string;
  handle?: string;
  image?: string;
};

type Tier = {
  id?: string;
  minItems: number;
  valueType: "PERCENTAGE" | "FIXED";
  value: number;
  label?: string;
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const campaign = await db.campaign.findFirst({
    where: { id: params.id, shop: session.shop, deletedAt: null },
    include: {
      triggers: { orderBy: { position: "asc" } },
      offers: { orderBy: { position: "asc" } },
      discount: { include: { tiers: { orderBy: { position: "asc" } } } },
    },
  });
  if (!campaign) throw new Response("Not found", { status: 404 });

  const shopRow = await db.shop.findUnique({ where: { shop: session.shop } });

  return { campaign, shopTimezone: shopRow?.timezone || "America/New_York" };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
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
    const data = JSON.parse(String(form.get("payload"))) as {
      name: string;
      status: string;
      title: string;
      subtitle: string;
      priority: number;
      triggerType: string;
      triggers: PickedResource[];
      offers: PickedResource[];
      startDate: string | null;
      endDate: string | null;
      timezone: string;
      settings: {
        showQuantityPicker: boolean;
        allowDeselectTrigger: boolean;
        doNotPreselect: boolean;
        randomizeOffers: boolean;
        limitOffersShown: number | null;
        autoMatchVariants: boolean;
      };
      discount: {
        type: "NONE" | "PERCENTAGE" | "FIXED" | "TIERED";
        value: number | null;
        tiers: Tier[];
      };
    };

    // Resolve effective status based on schedule
    let status = data.status;
    const now = new Date();
    const start = data.startDate ? new Date(data.startDate) : null;
    const end = data.endDate ? new Date(data.endDate) : null;
    if (status === "ACTIVE" && start && start > now) status = "SCHEDULED";
    if (end && end < now) status = "EXPIRED";

    await db.$transaction(async (tx) => {
      await tx.campaign.update({
        where: { id: campaign.id },
        data: {
          name: data.name,
          status,
          title: data.title || null,
          subtitle: data.subtitle || null,
          priority: data.priority,
          triggerType: data.triggerType,
          startDate: start,
          endDate: end,
          timezone: data.timezone,
          showQuantityPicker: data.settings.showQuantityPicker,
          allowDeselectTrigger: data.settings.allowDeselectTrigger,
          doNotPreselect: data.settings.doNotPreselect,
          randomizeOffers: data.settings.randomizeOffers,
          limitOffersShown: data.settings.limitOffersShown,
          autoMatchVariants: data.settings.autoMatchVariants,
        },
      });

      await tx.campaignTrigger.deleteMany({ where: { campaignId: campaign.id } });
      await tx.campaignOffer.deleteMany({ where: { campaignId: campaign.id } });

      if (data.triggerType !== "ALL_PRODUCTS" && data.triggers.length) {
        await tx.campaignTrigger.createMany({
          data: data.triggers.map((t, i) => ({
            campaignId: campaign.id,
            resourceType: data.triggerType === "SPECIFIC_COLLECTIONS" ? "collection" : "product",
            resourceId: t.id,
            resourceTitle: t.title,
            resourceHandle: t.handle,
            imageUrl: t.image,
            position: i,
          })),
        });
      }

      if (data.offers.length) {
        await tx.campaignOffer.createMany({
          data: data.offers.map((o, i) => ({
            campaignId: campaign.id,
            productId: o.id,
            productTitle: o.title,
            productHandle: o.handle,
            imageUrl: o.image,
            position: i,
          })),
        });
      }

      // Discount
      const existing = await tx.discount.findUnique({
        where: { campaignId: campaign.id },
      });

      if (data.discount.type === "NONE") {
        if (existing) await tx.discount.delete({ where: { id: existing.id } });
      } else {
        const discount = await tx.discount.upsert({
          where: { campaignId: campaign.id },
          create: {
            shop: session.shop,
            campaignId: campaign.id,
            type: data.discount.type,
            value: data.discount.value,
          },
          update: {
            type: data.discount.type,
            value: data.discount.value,
          },
        });

        await tx.discountTier.deleteMany({ where: { discountId: discount.id } });
        if (data.discount.type === "TIERED" && data.discount.tiers.length) {
          await tx.discountTier.createMany({
            data: data.discount.tiers.map((t, i) => ({
              discountId: discount.id,
              minItems: t.minItems,
              valueType: t.valueType,
              value: t.value,
              label: t.label || `Buy ${t.minItems}, get ${t.value}${t.valueType === "PERCENTAGE" ? "%" : ""}`,
              position: i,
            })),
          });
        }
      }

      await tx.shop.update({
        where: { shop: session.shop },
        data: { firstCampaignCreated: true },
      });
    });

    // Sync Shopify Function discount (see Step 4)
    try {
      const { syncShopifyDiscount } = await import("../services/discount-sync.server");
      await syncShopifyDiscount({ admin, campaignId: campaign.id, shop: session.shop });
    } catch (e) {
      console.error("Discount sync failed:", e);
    }

    return json({ ok: true });
  }

  return json({ ok: false });
};

export default function CampaignEditor() {
  const { campaign, shopTimezone } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const shopify = useAppBridge();
  const submit = useSubmit();

  const [name, setName] = useState(campaign.name);
  const [status, setStatus] = useState(campaign.status);
  const [title, setTitle] = useState(campaign.title ?? "");
  const [subtitle, setSubtitle] = useState(campaign.subtitle ?? "");
  const [priority, setPriority] = useState(String(campaign.priority));
  const [triggerType, setTriggerType] = useState(campaign.triggerType);
  const [triggers, setTriggers] = useState<PickedResource[]>(
    campaign.triggers.map((t) => ({ id: t.resourceId, title: t.resourceTitle, handle: t.resourceHandle ?? undefined, image: t.imageUrl ?? undefined })),
  );
  const [offers, setOffers] = useState<PickedResource[]>(
    campaign.offers.map((o) => ({ id: o.productId, title: o.productTitle, handle: o.productHandle ?? undefined, image: o.imageUrl ?? undefined })),
  );

  // Schedule
  const [startDate, setStartDate] = useState(campaign.startDate ? toDateInput(campaign.startDate) : toDateInput(new Date()));
  const [startTime, setStartTime] = useState(campaign.startDate ? toTimeInput(campaign.startDate) : "00:00");
  const [setEndDate, toggleSetEndDate] = useState(!!campaign.endDate);
  const [endDate, setEndDateValue] = useState(campaign.endDate ? toDateInput(campaign.endDate) : "");
  const [endTime, setEndTime] = useState(campaign.endDate ? toTimeInput(campaign.endDate) : "23:59");
  const [timezone, setTimezone] = useState(campaign.timezone || shopTimezone);

  // Settings
  const [showQuantityPicker, setShowQuantityPicker] = useState(campaign.showQuantityPicker);
  const [allowDeselectTrigger, setAllowDeselectTrigger] = useState(campaign.allowDeselectTrigger);
  const [doNotPreselect, setDoNotPreselect] = useState(campaign.doNotPreselect);
  const [randomizeOffers, setRandomizeOffers] = useState(campaign.randomizeOffers);
  const [limitEnabled, setLimitEnabled] = useState(campaign.limitOffersShown != null);
  const [limitValue, setLimitValue] = useState(String(campaign.limitOffersShown ?? 3));
  const [autoMatchVariants, setAutoMatchVariants] = useState(campaign.autoMatchVariants);

  // Discount
  const [discountType, setDiscountType] = useState<"NONE" | "PERCENTAGE" | "FIXED" | "TIERED">(
    (campaign.discount?.type as any) || "NONE",
  );
  const [discountValue, setDiscountValue] = useState(String(campaign.discount?.value ?? ""));
  const [tiers, setTiers] = useState<Tier[]>(
    campaign.discount?.tiers.map((t) => ({
      id: t.id, minItems: t.minItems, valueType: t.valueType as any, value: t.value, label: t.label ?? undefined,
    })) || [{ minItems: 2, valueType: "PERCENTAGE", value: 10 }],
  );

  const pickProducts = useCallback(async (target: "trigger" | "offer") => {
    const selection = await shopify.resourcePicker({
      type: "product", multiple: true, action: "select",
    });
    if (!selection) return;
    const picked: PickedResource[] = selection.map((p: any) => ({
      id: p.id, title: p.title, handle: p.handle, image: p.images?.[0]?.originalSrc,
    }));
    if (target === "trigger") setTriggers((prev) => dedupe([...prev, ...picked]));
    else setOffers((prev) => dedupe([...prev, ...picked]));
  }, [shopify]);

  const pickCollections = useCallback(async () => {
    const selection = await shopify.resourcePicker({
      type: "collection", multiple: true, action: "select",
    });
    if (!selection) return;
    const picked: PickedResource[] = selection.map((c: any) => ({
      id: c.id, title: c.title, handle: c.handle, image: c.image?.originalSrc,
    }));
    setTriggers((prev) => dedupe([...prev, ...picked]));
  }, [shopify]);

  const handleSave = () => {
    const payload = {
      name, status, title, subtitle, priority: Number(priority),
      triggerType,
      triggers: triggerType === "ALL_PRODUCTS" ? [] : triggers,
      offers,
      startDate: combineDateTime(startDate, startTime),
      endDate: setEndDate ? combineDateTime(endDate, endTime) : null,
      timezone,
      settings: {
        showQuantityPicker, allowDeselectTrigger, doNotPreselect, randomizeOffers,
        limitOffersShown: limitEnabled ? Number(limitValue) : null,
        autoMatchVariants,
      },
      discount: {
        type: discountType,
        value: discountType === "PERCENTAGE" || discountType === "FIXED" ? Number(discountValue) : null,
        tiers: discountType === "TIERED" ? tiers : [],
      },
    };

    const fd = new FormData();
    fd.append("intent", "save");
    fd.append("payload", JSON.stringify(payload));
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
      title={campaign.type.replace(/_/g, " ")}
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
            {/* Name */}
            <Card>
              <TextField label="Campaign name — for internal reference" value={name} onChange={setName} autoComplete="off" />
            </Card>

            {/* Trigger */}
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingSm">Trigger</Text>
                <Text as="p" tone="subdued">Select the products for which the offer is displayed on the product page.</Text>
                <Select
                  label="Type"
                  options={[
                    { label: "All products", value: "ALL_PRODUCTS" },
                    { label: "Specific products", value: "SPECIFIC_PRODUCTS" },
                    { label: "Specific collections", value: "SPECIFIC_COLLECTIONS" },
                  ]}
                  value={triggerType}
                  onChange={setTriggerType}
                />
                {triggerType === "SPECIFIC_PRODUCTS" && (
                  <ResourceList
                    items={triggers}
                    onAdd={() => pickProducts("trigger")}
                    onRemove={(id) => setTriggers((p) => p.filter((x) => x.id !== id))}
                    addLabel="Browse products"
                  />
                )}
                {triggerType === "SPECIFIC_COLLECTIONS" && (
                  <ResourceList
                    items={triggers}
                    onAdd={pickCollections}
                    onRemove={(id) => setTriggers((p) => p.filter((x) => x.id !== id))}
                    addLabel="Browse collections"
                  />
                )}
              </BlockStack>
            </Card>

            {/* Offers */}
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingSm">Offers</Text>
                <Text as="p" tone="subdued">The selected products will be offered as a bundle along with the trigger product.</Text>
                <ResourceList
                  items={offers}
                  onAdd={() => pickProducts("offer")}
                  onRemove={(id) => setOffers((p) => p.filter((x) => x.id !== id))}
                  addLabel="Browse products"
                />
              </BlockStack>
            </Card>

            {/* Campaign settings */}
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingSm">Campaign settings</Text>
                <Checkbox label="Show quantity picker" checked={showQuantityPicker} onChange={setShowQuantityPicker} />
                <Checkbox label="Allow customers to de-select the trigger product" checked={allowDeselectTrigger} onChange={setAllowDeselectTrigger} />
                <Checkbox label="Do not preselect the items in the bundle" checked={doNotPreselect} onChange={setDoNotPreselect} />
                <Checkbox label="Randomize the order of offer products" checked={randomizeOffers} onChange={setRandomizeOffers} />
                <Checkbox label="Limit number of offered products shown" checked={limitEnabled} onChange={setLimitEnabled} />
                {limitEnabled && (
                  <TextField label="Max offers" type="number" value={limitValue} onChange={setLimitValue} autoComplete="off" min={1} />
                )}
                <Checkbox
                  label="Automatically match offer product variants with the trigger product"
                  helpText="Variant match will be attempted based on the variant name."
                  checked={autoMatchVariants}
                  onChange={setAutoMatchVariants}
                />
              </BlockStack>
            </Card>

            {/* Discount */}
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingSm">Discounts</Text>
                <Select
                  label="Type"
                  options={[
                    { label: "No discount", value: "NONE" },
                    { label: "Percentage", value: "PERCENTAGE" },
                    { label: "Fixed amount", value: "FIXED" },
                    { label: "Tiered (Buy X get Y%)", value: "TIERED" },
                  ]}
                  value={discountType}
                  onChange={(v) => setDiscountType(v as any)}
                />

                {(discountType === "PERCENTAGE" || discountType === "FIXED") && (
                  <TextField
                    label={discountType === "PERCENTAGE" ? "Percentage off" : "Amount off"}
                    type="number"
                    value={discountValue}
                    onChange={setDiscountValue}
                    suffix={discountType === "PERCENTAGE" ? "%" : undefined}
                    autoComplete="off"
                  />
                )}

                {discountType === "TIERED" && (
                  <TierEditor tiers={tiers} onChange={setTiers} />
                )}
              </BlockStack>
            </Card>

            {/* Schedule */}
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <Text as="h3" variant="headingSm">Schedule campaign</Text>
                  <Text as="span" tone="subdued">{timezone}</Text>
                </InlineStack>
                <Text as="p" tone="subdued">Choose a start and end date to control when your campaign goes live.</Text>
                <InlineStack gap="300">
                  <Box minWidth="200px"><TextField label="Start date" type="date" value={startDate} onChange={setStartDate} autoComplete="off" /></Box>
                  <Box minWidth="140px"><TextField label="Start time" type="time" value={startTime} onChange={setStartTime} autoComplete="off" /></Box>
                </InlineStack>
                <Checkbox label="Set end date" checked={setEndDate} onChange={toggleSetEndDate} />
                {setEndDate && (
                  <InlineStack gap="300">
                    <Box minWidth="200px"><TextField label="End date" type="date" value={endDate} onChange={setEndDateValue} autoComplete="off" /></Box>
                    <Box minWidth="140px"><TextField label="End time" type="time" value={endTime} onChange={setEndTime} autoComplete="off" /></Box>
                  </InlineStack>
                )}
                <Select
                  label="Timezone"
                  options={TIMEZONES.map((tz) => ({ label: tz, value: tz }))}
                  value={timezone}
                  onChange={setTimezone}
                />
              </BlockStack>
            </Card>

            {/* Other settings */}
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingSm">Other settings</Text>
                <TextField label="Campaign title" value={title} onChange={setTitle} placeholder="Optional. Eg: People also bought" helpText="This setting overrides the widget's default title." autoComplete="off" />
                <TextField label="Campaign sub-title" value={subtitle} onChange={setSubtitle} placeholder="Optional. Eg: Flaunt your style with this recommended outfit" helpText="Supports {{discount}} and {{timer}} template variables." autoComplete="off" />
                <TextField label="Campaign priority" type="number" value={priority} onChange={setPriority} placeholder="10" helpText="When several campaigns match a trigger, higher priority wins." autoComplete="off" />
              </BlockStack>
            </Card>

            <Card>
              <Select label="Status" options={[
                { label: "Draft", value: "DRAFT" },
                { label: "Active", value: "ACTIVE" },
                { label: "Paused", value: "PAUSED" },
              ]} value={status} onChange={setStatus} />
            </Card>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">Customize appearance</Text>
              <Text as="p" tone="subdued">The styling, text, and translations can be customised from the widget settings.</Text>
              <Button url="/app/customize">Customize widget</Button>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

/* ---------------- Sub-components ---------------- */

function ResourceList({
  items, onAdd, onRemove, addLabel,
}: { items: PickedResource[]; onAdd: () => void; onRemove: (id: string) => void; addLabel: string }) {
  return (
    <BlockStack gap="200">
      <InlineStack><Button onClick={onAdd}>{addLabel}</Button></InlineStack>
      {items.map((p) => (
        <Box key={p.id} padding="300" background="bg-surface-secondary" borderRadius="200">
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="300" blockAlign="center">
              {p.image && <Thumbnail source={p.image} alt={p.title} size="small" />}
              <Text as="span">{p.title}</Text>
            </InlineStack>
            <Button icon={DeleteIcon} variant="tertiary" onClick={() => onRemove(p.id)} accessibilityLabel="Remove" />
          </InlineStack>
        </Box>
      ))}
    </BlockStack>
  );
}

function TierEditor({ tiers, onChange }: { tiers: Tier[]; onChange: (t: Tier[]) => void }) {
  const update = (i: number, patch: Partial<Tier>) => {
    const next = [...tiers]; next[i] = { ...next[i], ...patch }; onChange(next);
  };
  const add = () => onChange([...tiers, { minItems: tiers.length + 2, valueType: "PERCENTAGE", value: 10 }]);
  const remove = (i: number) => onChange(tiers.filter((_, idx) => idx !== i));

  return (
    <BlockStack gap="300">
      <Text as="p" tone="subdued">Configure multiple discount tiers. Example: "Buy 4, get 25%".</Text>
      {tiers.map((t, i) => (
        <Box key={i} padding="300" background="bg-surface-secondary" borderRadius="200">
          <InlineStack gap="200" align="space-between" blockAlign="end">
            <InlineStack gap="200">
              <Box minWidth="110px">
                <TextField label="Min items" type="number" value={String(t.minItems)} onChange={(v) => update(i, { minItems: Number(v) })} autoComplete="off" min={1} />
              </Box>
              <Box minWidth="140px">
                <Select label="Type" options={[
                  { label: "Percentage", value: "PERCENTAGE" },
                  { label: "Fixed amount", value: "FIXED" },
                ]} value={t.valueType} onChange={(v) => update(i, { valueType: v as any })} />
              </Box>
              <Box minWidth="110px">
                <TextField label={t.valueType === "PERCENTAGE" ? "% off" : "Amount"} type="number" value={String(t.value)} onChange={(v) => update(i, { value: Number(v) })} autoComplete="off" />
              </Box>
            </InlineStack>
            <Button icon={DeleteIcon} variant="tertiary" onClick={() => remove(i)} accessibilityLabel="Remove tier" />
          </InlineStack>
        </Box>
      ))}
      <InlineStack><Button onClick={add}>Add tier</Button></InlineStack>
    </BlockStack>
  );
}

/* ---------------- Helpers ---------------- */

function dedupe(arr: PickedResource[]): PickedResource[] {
  const seen = new Set<string>();
  return arr.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}

function toDateInput(d: Date | string) {
  const dt = new Date(d);
  return dt.toISOString().slice(0, 10);
}

function toTimeInput(d: Date | string) {
  const dt = new Date(d);
  return dt.toISOString().slice(11, 16);
}

function combineDateTime(date: string, time: string): string | null {
  if (!date) return null;
  return new Date(`${date}T${time || "00:00"}:00Z`).toISOString();
}

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Toronto", "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Madrid",
  "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney", "UTC",
];
