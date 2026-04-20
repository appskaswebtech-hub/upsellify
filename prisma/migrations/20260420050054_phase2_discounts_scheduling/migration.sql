-- AlterTable
ALTER TABLE "CampaignOffer" ADD COLUMN "variantId" TEXT;

-- CreateTable
CREATE TABLE "Discount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'NONE',
    "value" REAL,
    "shopifyDiscountId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Discount_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DiscountTier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "discountId" TEXT NOT NULL,
    "minItems" INTEGER NOT NULL,
    "valueType" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "label" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DiscountTier_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "Discount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CollectionProductCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "productIds" JSONB NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

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
    "startDate" DATETIME,
    "endDate" DATETIME,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "triggerType" TEXT NOT NULL DEFAULT 'SPECIFIC_PRODUCTS',
    "title" TEXT,
    "subtitle" TEXT,
    "showQuantityPicker" BOOLEAN NOT NULL DEFAULT false,
    "allowDeselectTrigger" BOOLEAN NOT NULL DEFAULT false,
    "doNotPreselect" BOOLEAN NOT NULL DEFAULT false,
    "randomizeOffers" BOOLEAN NOT NULL DEFAULT false,
    "limitOffersShown" INTEGER,
    "autoMatchVariants" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Campaign_shop_fkey" FOREIGN KEY ("shop") REFERENCES "Shop" ("shop") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Campaign" ("createdAt", "deletedAt", "id", "name", "placement", "priority", "shop", "status", "subtitle", "title", "triggerType", "type", "updatedAt") SELECT "createdAt", "deletedAt", "id", "name", "placement", "priority", "shop", "status", "subtitle", "title", "triggerType", "type", "updatedAt" FROM "Campaign";
DROP TABLE "Campaign";
ALTER TABLE "new_Campaign" RENAME TO "Campaign";
CREATE INDEX "Campaign_shop_status_idx" ON "Campaign"("shop", "status");
CREATE INDEX "Campaign_shop_placement_status_idx" ON "Campaign"("shop", "placement", "status");
CREATE INDEX "Campaign_shop_triggerType_idx" ON "Campaign"("shop", "triggerType");
CREATE TABLE "new_Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "installedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uninstalledAt" DATETIME,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "embedEnabled" BOOLEAN NOT NULL DEFAULT false,
    "firstCampaignCreated" BOOLEAN NOT NULL DEFAULT false,
    "storeVerified" BOOLEAN NOT NULL DEFAULT false,
    "widgetTitle" TEXT NOT NULL DEFAULT 'Frequently bought together',
    "widgetSubtitle" TEXT,
    "widgetCtaLabel" TEXT NOT NULL DEFAULT 'Add bundle to cart',
    "widgetAccentColor" TEXT NOT NULL DEFAULT '#000000',
    "widgetTextColor" TEXT NOT NULL DEFAULT '#202020',
    "widgetBorderRadius" INTEGER NOT NULL DEFAULT 8,
    "widgetFontFamily" TEXT NOT NULL DEFAULT 'inherit',
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
CREATE UNIQUE INDEX "Discount_campaignId_key" ON "Discount"("campaignId");

-- CreateIndex
CREATE INDEX "Discount_shop_idx" ON "Discount"("shop");

-- CreateIndex
CREATE INDEX "DiscountTier_discountId_idx" ON "DiscountTier"("discountId");

-- CreateIndex
CREATE INDEX "CollectionProductCache_expiresAt_idx" ON "CollectionProductCache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionProductCache_shop_collectionId_key" ON "CollectionProductCache"("shop", "collectionId");
