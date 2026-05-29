import {
  DiscountClass,
  ProductDiscountSelectionStrategy,
} from "../generated/api";

/**
 * @typedef {import("../generated/api").CartInput} RunInput
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} CartLinesDiscountsGenerateRunResult
 */

/**
 * @param {RunInput} input
 * @returns {CartLinesDiscountsGenerateRunResult}
 */
export function cartLinesDiscountsGenerateRun(input) {
  const EMPTY = { operations: [] };
  if (!input.cart.lines.length) return EMPTY;

  const hasProductDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Product,
  );
  if (!hasProductDiscountClass) return EMPTY;

  const metafieldValue = input.discount?.metafield?.value;
  if (!metafieldValue) return EMPTY;

  let config;
  try {
    config = JSON.parse(metafieldValue);
  } catch {
    return EMPTY;
  }
  if (!config?.campaigns?.length) return EMPTY;

  const candidates = [];

  // for (const campaign of config.campaigns) {
  //   const bundleLines = input.cart.lines.filter((line) => {
  //     const productId = line.merchandise?.product?.id;
  //     return productId && campaign.productIds.includes(productId);
  //   });
  //   if (bundleLines.length === 0) continue;

  //   const totalQty = bundleLines.reduce((sum, l) => sum + l.quantity, 0);

  //   const tier = (campaign.tiers || [])
  //     .filter((t) => totalQty >= t.minItems)
  //     .sort((a, b) => b.minItems - a.minItems)[0];
  //   if (!tier) continue;

  //   const value =
  //     tier.valueType === "PERCENTAGE"
  //       ? { percentage: { value: tier.value } }
  //       : { fixedAmount: { amount: tier.value } };

  //   candidates.push({
  //     message: `Bundle: ${tier.value}${tier.valueType === "PERCENTAGE" ? "%" : ""} off`,
  //     targets: bundleLines.map((l) => ({ cartLine: { id: l.id } })),
  //     value,
  //   });
  // }
for (const campaign of config.campaigns) {
  // Group lines by bundle ID, matching only lines that belong to this campaign
  const bundleGroups = new Map();
  for (const line of input.cart.lines) {
    const bundleId = line.bundleId?.value;
    if (!bundleId) continue;
    const lineCampaignId = line.campaignId?.value;
    if (lineCampaignId && lineCampaignId !== campaign.campaignId) continue;
    const productId = line.merchandise?.product?.id;
    if (!productId || !campaign.productIds.includes(productId)) continue;
    if (!bundleGroups.has(bundleId)) bundleGroups.set(bundleId, []);
    bundleGroups.get(bundleId).push(line);
  }

  for (const [bundleId, bundleLines] of bundleGroups) {
    const totalQty = bundleLines.reduce((s, l) => s + l.quantity, 0);
    const tier = (campaign.tiers || [])
      .filter((t) => totalQty >= t.minItems)
      .sort((a, b) => b.minItems - a.minItems)[0];
    if (!tier) continue;

    const value = tier.valueType === "PERCENTAGE"
      ? { percentage: { value: tier.value } }
      : { fixedAmount: { amount: tier.value } };

    candidates.push({
      message: `Bundle: ${tier.value}${tier.valueType === "PERCENTAGE" ? "%" : ""} off`,
      targets: bundleLines.map((l) => ({ cartLine: { id: l.id } })),
      value,
    });
  }
}
  if (candidates.length === 0) return EMPTY;

  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates,
          selectionStrategy: ProductDiscountSelectionStrategy.First,
        },
      },
    ],
  };
}
