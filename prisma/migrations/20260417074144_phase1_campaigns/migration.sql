/*
  Warnings:

  - You are about to drop the `AnalyticsEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Discount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DiscountTier` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WebhookLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `allowDeselectTrigger` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `autoMatchVariants` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `clicks` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `conversions` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `doNotPreselectItems` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `impressions` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `limitOfferedProducts` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `offerMode` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `randomizeOfferOrder` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `revenue` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `showQuantityPicker` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `startTimezone` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `hidden` on the `CampaignOffer` table. All the data in the column will be lost.
  - You are about to drop the column `hidden` on the `CampaignTrigger` table. All the data in the column will be lost.
  - You are about to drop the column `brandColor` on the `Shop` table. All the data in the column will be lost.
  - You are about to drop the column `buttonColor` on the `Shop` table. All the data in the column will be lost.
  - You are about to drop the column `buttonTextColor` on the `Shop` table. All the data in the column will be lost.
  - You are about to drop the column `fontFamily` on the `Shop` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "AnalyticsEvent_shop_eventType_createdAt_idx";

-- DropIndex
DROP INDEX "AnalyticsEvent_shop_createdAt_idx";

-- DropIndex
DROP INDEX "AnalyticsEvent_shop_campaignId_eventType_idx";

-- DropIndex
DROP INDEX "Discount_shop_idx";

-- DropIndex
DROP INDEX "Discount_campaignId_key";

-- DropIndex
DROP INDEX "DiscountTier_discountId_idx";

-- DropIndex
DROP INDEX "WebhookLog_shop_topic_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AnalyticsEvent";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Discount";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "DiscountTier";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "WebhookLog";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "placement" TEXT NOT NULL DEFAULT 'PRODUCT_PAGE',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "triggerType" TEXT NOT NULL DEFAULT 'SPECIFIC_PRODUCTS',
    "title" TEXT,
    "subtitle" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Campaign_shop_fkey" FOREIGN KEY ("shop") REFERENCES "Shop" ("shop") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Campaign" ("createdAt", "deletedAt", "id", "name", "placement", "priority", "shop", "status", "subtitle", "title", "triggerType", "type", "updatedAt") SELECT "createdAt", "deletedAt", "id", "name", "placement", coalesce("priority", 0) AS "priority", "shop", "status", "subtitle", "title", "triggerType", "type", "updatedAt" FROM "Campaign";
DROP TABLE "Campaign";
ALTER TABLE "new_Campaign" RENAME TO "Campaign";
CREATE INDEX "Campaign_shop_status_idx" ON "Campaign"("shop", "status");
CREATE INDEX "Campaign_shop_placement_status_idx" ON "Campaign"("shop", "placement", "status");
CREATE TABLE "new_CampaignOffer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "productHandle" TEXT,
    "imageUrl" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CampaignOffer_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CampaignOffer" ("campaignId", "id", "imageUrl", "position", "productHandle", "productId", "productTitle") SELECT "campaignId", "id", "imageUrl", "position", "productHandle", "productId", "productTitle" FROM "CampaignOffer";
DROP TABLE "CampaignOffer";
ALTER TABLE "new_CampaignOffer" RENAME TO "CampaignOffer";
CREATE INDEX "CampaignOffer_campaignId_idx" ON "CampaignOffer"("campaignId");
CREATE TABLE "new_CampaignTrigger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceTitle" TEXT NOT NULL,
    "resourceHandle" TEXT,
    "imageUrl" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CampaignTrigger_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CampaignTrigger" ("campaignId", "id", "imageUrl", "position", "resourceHandle", "resourceId", "resourceTitle", "resourceType") SELECT "campaignId", "id", "imageUrl", "position", "resourceHandle", "resourceId", "resourceTitle", "resourceType" FROM "CampaignTrigger";
DROP TABLE "CampaignTrigger";
ALTER TABLE "new_CampaignTrigger" RENAME TO "CampaignTrigger";
CREATE INDEX "CampaignTrigger_campaignId_idx" ON "CampaignTrigger"("campaignId");
CREATE INDEX "CampaignTrigger_resourceId_idx" ON "CampaignTrigger"("resourceId");
CREATE TABLE "new_Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "installedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uninstalledAt" DATETIME,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "embedEnabled" BOOLEAN NOT NULL DEFAULT false,
    "firstCampaignCreated" BOOLEAN NOT NULL DEFAULT false,
    "storeVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Shop" ("createdAt", "currency", "embedEnabled", "firstCampaignCreated", "id", "installedAt", "locale", "plan", "shop", "storeVerified", "uninstalledAt", "updatedAt") SELECT "createdAt", "currency", "embedEnabled", "firstCampaignCreated", "id", "installedAt", "locale", "plan", "shop", "storeVerified", "uninstalledAt", "updatedAt" FROM "Shop";
DROP TABLE "Shop";
ALTER TABLE "new_Shop" RENAME TO "Shop";
CREATE UNIQUE INDEX "Shop_shop_key" ON "Shop"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Session_shop_idx" ON "Session"("shop");
