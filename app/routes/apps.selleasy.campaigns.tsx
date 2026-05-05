import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.public.appProxy(request);
  if (!session) return json({ campaigns: [] }, { status: 401 });

  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");
  if (!productId) return json({ campaigns: [] });

  const gid = `gid://shopify/Product/${productId}`;
  const now = new Date();

  const shopRow = await db.shop.findUnique({ where: { shop: session.shop } });

  const candidates = await db.campaign.findMany({
    where: {
      shop: session.shop,
      status: "ACTIVE",
      placement: "PRODUCT_PAGE",
      deletedAt: null,
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: now } }] },
        { OR: [{ endDate: null }, { endDate: { gt: now } }] },
      ],
      OR: [
        { triggerType: "ALL_PRODUCTS" },
        { triggerType: "SPECIFIC_PRODUCTS", triggers: { some: { resourceId: gid } } },
        { triggerType: "SPECIFIC_COLLECTIONS" },
      ],
    },
    include: {
      offers: { orderBy: { position: "asc" } },
      triggers: true,
      discount: { include: { tiers: { orderBy: { position: "asc" } } } },
    },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
  });

  // Filter collection-based campaigns by resolved membership
  const filtered = [];
  for (const c of candidates) {
    if (c.triggerType !== "SPECIFIC_COLLECTIONS") {
      filtered.push(c);
      continue;
    }
    const colIds = c.triggers
      .filter((t) => t.resourceType === "collection")
      .map((t) => t.resourceId);
    if (await productInAnyCollection(admin, session.shop, gid, colIds)) {
      filtered.push(c);
    }
  }

  if (filtered.length === 0) return json({ campaigns: [] });

  const winner = filtered[0];

  let offers = [...winner.offers];
  if (winner.randomizeOffers) offers.sort(() => Math.random() - 0.5);
  if (winner.limitOffersShown) offers = offers.slice(0, winner.limitOffersShown);

  const payload = {
    id: winner.id,
    type: winner.type,
    title: interpolate(
      winner.title || shopRow?.widgetTitle || "Frequently bought together",
      winner,
    ),
    subtitle: interpolate(winner.subtitle || shopRow?.widgetSubtitle || "", winner),
    ctaLabel: shopRow?.widgetCtaLabel || "Add bundle to cart",
    settings: {
      showQuantityPicker: winner.showQuantityPicker,
      allowDeselectTrigger: winner.allowDeselectTrigger,
      doNotPreselect: winner.doNotPreselect,
      autoMatchVariants: winner.autoMatchVariants,
    },
    appearance: {
      accentColor: shopRow?.widgetAccentColor || "#000000",
      textColor: shopRow?.widgetTextColor || "#202020",
      borderRadius: shopRow?.widgetBorderRadius || 8,
      fontFamily: shopRow?.widgetFontFamily || "inherit",
    },
    discount: winner.discount
      ? {
          type: winner.discount.type,
          value: winner.discount.value,
          tiers: winner.discount.tiers.map((t) => ({
            minItems: t.minItems,
            valueType: t.valueType,
            value: t.value,
            label: t.label,
          })),
        }
      : null,
    offers: offers.map((o) => ({
      id: o.productId.replace("gid://shopify/Product/", ""),
      title: o.productTitle,
      handle: o.productHandle,
      image: o.imageUrl,
    })),
  };

  return json(
    { campaigns: [payload] },
    { headers: { "Cache-Control": "private, max-age=30" } },
  );
};

function interpolate(template: string, c: any): string {
  if (!template) return "";
  let result = template;
  if (c.discount) {
    const top =
      c.discount.type === "TIERED" && c.discount.tiers?.length
        ? [...c.discount.tiers].sort((a: any, b: any) => b.value - a.value)[0]
        : { value: c.discount.value, valueType: c.discount.type };
    if (top) {
      const label =
        top.valueType === "PERCENTAGE" ? `${top.value}%` : `$${top.value}`;
      result = result.replace(/\{\{\s*discount\s*\}\}/g, label);
    }
  }
  if (c.endDate) {
    const remaining = Math.max(0, new Date(c.endDate).getTime() - Date.now());
    const hours = Math.floor(remaining / 3.6e6);
    const mins = Math.floor((remaining % 3.6e6) / 6e4);
    result = result.replace(/\{\{\s*timer\s*\}\}/g, `${hours}h ${mins}m`);
  }
  return result;
}

async function productInAnyCollection(
  admin: any,
  shop: string,
  productGid: string,
  collectionIds: string[],
): Promise<boolean> {
  for (const colId of collectionIds) {
    const cached = await db.collectionProductCache.findUnique({
      where: { shop_collectionId: { shop, collectionId: colId } },
    });
    let productIds: string[];
    if (cached && cached.expiresAt > new Date()) {
      productIds = cached.productIds as string[];
    } else {
      productIds = await fetchCollectionProducts(admin, colId);
      await db.collectionProductCache.upsert({
        where: { shop_collectionId: { shop, collectionId: colId } },
        create: {
          shop, collectionId: colId,
          productIds,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
        update: {
          productIds,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });
    }
    if (productIds.includes(productGid)) return true;
  }
  return false;
}

async function fetchCollectionProducts(admin: any, collectionId: string): Promise<string[]> {
  const res = await admin.graphql(
    `query($id: ID!) {
      collection(id: $id) {
        products(first: 250) { nodes { id } }
      }
    }`,
    { variables: { id: collectionId } },
  );
  const data = await res.json();
  return data.data?.collection?.products?.nodes?.map((n: any) => n.id) || [];
}
