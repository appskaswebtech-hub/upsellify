import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const type = params.type!;

if (!["FBT_LIST", "FBT_AMAZON", "FBT_CLASSIC"].includes(type)) {
  throw new Response("Unsupported type", { status: 400 });
}
  const campaign = await db.campaign.create({
    data: {
      shop: session.shop,
      name: "Untitled campaign",
      type,
      status: "DRAFT",
      placement: "PRODUCT_PAGE",
    },
  });

  return redirect(`/app/campaigns/${campaign.id}`);
};
