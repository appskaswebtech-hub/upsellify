import db from "../db.server";

type AdminApi = {
  graphql: (query: string, options?: { variables?: any }) => Promise<Response>;
};

const FUNCTION_TITLE = "upsellify-discount";
// ^^ must match the `handle` in extensions/upsellify-discount/shopify.extension.toml

export async function syncShopifyDiscount({
  admin,
  shop,
}: {
  admin: AdminApi;
  shop: string;
}) {
  // ── 1. Gather config ──
  const campaigns = await db.campaign.findMany({
    where: {
      shop,
      deletedAt: null,
      status: { in: ["ACTIVE", "SCHEDULED"] },
      discount: { is: { NOT: { type: "NONE" } } },
    },
    include: {
      discount: { include: { tiers: { orderBy: { position: "asc" } } } },
      offers: true,
      triggers: true,
    },
  });

  const config = {
    campaigns: campaigns
      .map((c) => {
        if (!c.discount || c.discount.type === "NONE") return null;

        const productIds = Array.from(
          new Set([
            ...c.triggers
              .filter((t) => t.resourceType === "product")
              .map((t) => t.resourceId),
            ...c.offers.map((o) => o.productId),
          ]),
        );
        if (productIds.length === 0) return null;

        let tiers: { minItems: number; valueType: string; value: number }[] = [];
        if (c.discount.type === "TIERED") {
          tiers = c.discount.tiers.map((t) => ({
            minItems: t.minItems,
            valueType: t.valueType,
            value: t.value,
          }));
        } else if (c.discount.type === "PERCENTAGE") {
          tiers = [{ minItems: 1, valueType: "PERCENTAGE", value: c.discount.value || 0 }];
        } else if (c.discount.type === "FIXED") {
          tiers = [{ minItems: 1, valueType: "FIXED", value: c.discount.value || 0 }];
        }
        if (tiers.length === 0) return null;

        return { campaignId: c.id, productIds, tiers };
      })
      .filter(Boolean),
  };

  const shopRow = await db.shop.findUnique({ where: { shop } });

  // Nothing to sync and nothing exists → exit
  if (!shopRow?.shopifyDiscountId && config.campaigns.length === 0) return;

  // ── 2. Create the discount if we don't have one yet ──
  if (!shopRow?.shopifyDiscountId) {
    const functionId = await findDiscountFunctionId(admin);
    if (!functionId) {
      console.error(
        "[discount-sync] No discount function found.\n" +
          "  Fix: run `shopify app deploy` to push the extension to Shopify.\n" +
          "  (shopify app dev is not enough — the function must be deployed.)",
      );
      return;
    }

    const createRes = await admin.graphql(
      `mutation Create($automaticAppDiscount: DiscountAutomaticAppInput!) {
        discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
          automaticAppDiscount { discountId }
          userErrors { field message code }
        }
      }`,
      {
        variables: {
          automaticAppDiscount: {
            title: "Selleasy bundle discount",
            functionId,
            discountClasses: ["PRODUCT"],
            startsAt: new Date().toISOString(),
            metafields: [
              {
                namespace: "selleasy",
                key: "config",
                type: "json",
                value: JSON.stringify(config),
              },
            ],
          },
        },
      },
    );
    const createJson: any = await createRes.json();
    const errs = createJson.data?.discountAutomaticAppCreate?.userErrors;
    if (errs?.length) {
      console.error("[discount-sync] Create errors:", errs);
      return;
    }
    const discountId =
      createJson.data?.discountAutomaticAppCreate?.automaticAppDiscount?.discountId;
    if (discountId) {
      await db.shop.update({
        where: { shop },
        data: { shopifyDiscountId: discountId },
      });
      console.log("[discount-sync] Created discount:", discountId);
    }
    return;
  }

  // ── 3. Update existing discount's metafield ──
  await updateMetafield(admin, shopRow.shopifyDiscountId, config);
}

/**
 * Find the discount function ID for this app.
 * Handles all known variations of the `apiType` field across API versions.
 */
async function findDiscountFunctionId(admin: AdminApi): Promise<string | null> {
  const res = await admin.graphql(
    `query {
      shopifyFunctions(first: 50) {
        nodes {
          id
          title
          apiType
          app { title }
        }
      }
    }`,
  );
  const json: any = await res.json();
  const nodes = json.data?.shopifyFunctions?.nodes || [];

  console.log(
    "[discount-sync] Functions seen by Shopify:",
    JSON.stringify(nodes, null, 2),
  );

  if (nodes.length === 0) {
    console.error(
      "[discount-sync] shopifyFunctions returned ZERO nodes. " +
        "The extension hasn't been deployed to this shop yet. " +
        "Run `shopify app deploy` and re-install the app.",
    );
    return null;
  }

  // Match on apiType (case-insensitive, handles singular + plural) OR title
  const discountFn = nodes.find((n: any) => {
    const api = String(n.apiType || "").toLowerCase();
    const title = String(n.title || "").toLowerCase();
    const handle = String(n.handle || "").toLowerCase();
    return (
      api === "discounts" ||
      api === "discount" ||
      api.startsWith("discount") ||
      title === FUNCTION_TITLE.toLowerCase() ||
      title.includes("selleasy") ||
      title.includes("upsellify") ||
      handle === FUNCTION_TITLE.toLowerCase()
    );
  });

  if (!discountFn) {
    console.error(
      "[discount-sync] Found functions but none matched a discount function. " +
        "Check the logged output above — the `apiType` or `title` field may have changed.",
    );
    return null;
  }

  console.log(
    `[discount-sync] Matched function: ${discountFn.title} (apiType=${discountFn.apiType})`,
  );
  return discountFn.id;
}

async function updateMetafield(admin: AdminApi, discountId: string, config: any) {
  const res = await admin.graphql(
    `mutation Update($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id }
        userErrors { field message }
      }
    }`,
    {
      variables: {
        metafields: [
          {
            ownerId: discountId,
            namespace: "selleasy",
            key: "config",
            type: "json",
            value: JSON.stringify(config),
          },
        ],
      },
    },
  );
  const json: any = await res.json();
  const errs = json.data?.metafieldsSet?.userErrors;
  if (errs?.length) {
    console.error("[discount-sync] Metafield errors:", errs);
  } else {
    console.log("[discount-sync] Updated discount metafield:", discountId);
  }
}
