import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Verifies HMAC signature and returns the authenticated shop
  const { session } = await authenticate.public.appProxy(request);
  if (!session) return json({ campaigns: [] }, { status: 401 });

  const url = new URL(request.url);
  const productId = url.searchParams.get("productId"); // numeric Shopify product ID
  if (!productId) return json({ campaigns: [] });

  const gid = `gid://shopify/Product/${productId}`;

  const campaigns = await db.campaign.findMany({
    where: {
      shop: session.shop,
      status: "ACTIVE",
      placement: "PRODUCT_PAGE",
      deletedAt: null,
      triggers: { some: { resourceId: gid } },
    },
    include: { offers: { orderBy: { position: "asc" } } },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    take: 1, // highest priority wins
  });

  const payload = campaigns.map((c) => ({
    id: c.id,
    title: c.title || "Frequently bought together",
    subtitle: c.subtitle,
    offers: c.offers.map((o) => ({
      id: o.productId.replace("gid://shopify/Product/", ""),
      title: o.productTitle,
      handle: o.productHandle,
      image: o.imageUrl,
    })),
  }));

  return json(
    { campaigns: payload },
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=30",
      },
    },
  );
};
