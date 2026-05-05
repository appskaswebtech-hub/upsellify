import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const activated = await db.campaign.updateMany({
    where: {
      status: "SCHEDULED",
      startDate: { lte: now },
      deletedAt: null,
      OR: [{ endDate: null }, { endDate: { gt: now } }],
    },
    data: { status: "ACTIVE" },
  });

  const expired = await db.campaign.updateMany({
    where: {
      status: "ACTIVE",
      endDate: { lte: now },
      deletedAt: null,
    },
    data: { status: "EXPIRED" },
  });

  return json({
    activated: activated.count,
    expired: expired.count,
    ranAt: now.toISOString(),
  });
};
