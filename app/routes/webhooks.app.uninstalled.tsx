import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // deleteMany is idempotent — safe if webhook fires multiple times after uninstall.
  // Deleting Shop last cascades to Campaign → CampaignTrigger, CampaignOffer, Discount → DiscountTier.
  await db.$transaction([
    db.session.deleteMany({ where: { shop } }),
    db.analyticsEvent.deleteMany({ where: { shop } }),
    db.collectionProductCache.deleteMany({ where: { shop } }),
    db.shopPlan.deleteMany({ where: { shop } }),
    db.shop.deleteMany({ where: { shop } }),
  ]);

  return new Response();
};
