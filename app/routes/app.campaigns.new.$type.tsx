import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect, json } from "@remix-run/node";

import { authenticate } from "../shopify.server";
import db from "../db.server";

const CAMPAIGN_LIMITS: Record<string, number> = {
  free: 1,
  basic: 10,
  advanced: Infinity,
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const type = params.type!;

  // ✅ VALIDATE TYPE
  if (!["FBT_LIST", "FBT_AMAZON", "FBT_CLASSIC"].includes(type)) {
    throw new Response("Unsupported type", { status: 400 });
  }

  // ✅ GET SHOP
  const shop = await db.shop.upsert({
    where: {
      shop: session.shop,
    },
    update: {},
    create: {
      shop: session.shop,
    },
  });

  // ✅ CURRENT PLAN
  const plan = shop.plan ?? "free";

  // ✅ COUNT CAMPAIGNS
  const totalCampaigns = await db.campaign.count({
    where: {
      shop: session.shop,
    },
  });

  // ✅ LIMIT CHECK
  const limit = CAMPAIGN_LIMITS[plan];

  // =========================
  // FREE PLAN LIMIT
  // =========================

  if (plan === "free" && totalCampaigns >= limit) {
    return redirect(
      "/app/plans?reason=campaign_limit_free",
    );
  }

  // =========================
  // BASIC PLAN LIMIT
  // =========================

  if (plan === "basic" && totalCampaigns >= limit) {
    return redirect(
      "/app/plans?reason=campaign_limit_basic",
    );
  }

  // =========================
  // ADVANCED = UNLIMITED
  // =========================

  // ✅ CREATE CAMPAIGN
  const campaign = await db.campaign.create({
    data: {
      shop: session.shop,
      name: "Untitled campaign",
      type,
      status: "DRAFT",
      placement: "PRODUCT_PAGE",
    },
  });

  // ✅ REDIRECT
  return redirect(`/app/campaigns/${campaign.id}`);
};