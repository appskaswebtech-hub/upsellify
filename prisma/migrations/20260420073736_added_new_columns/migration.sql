/*
  Warnings:

  - You are about to drop the column `shopifyDiscountId` on the `Discount` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Shop" ADD COLUMN "shopifyDiscountId" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'FBT_LIST',
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
INSERT INTO "new_Campaign" ("allowDeselectTrigger", "autoMatchVariants", "createdAt", "deletedAt", "doNotPreselect", "endDate", "id", "limitOffersShown", "name", "placement", "priority", "randomizeOffers", "shop", "showQuantityPicker", "startDate", "status", "subtitle", "timezone", "title", "triggerType", "type", "updatedAt") SELECT "allowDeselectTrigger", "autoMatchVariants", "createdAt", "deletedAt", "doNotPreselect", "endDate", "id", "limitOffersShown", "name", "placement", "priority", "randomizeOffers", "shop", "showQuantityPicker", "startDate", "status", "subtitle", "timezone", "title", "triggerType", "type", "updatedAt" FROM "Campaign";
DROP TABLE "Campaign";
ALTER TABLE "new_Campaign" RENAME TO "Campaign";
CREATE INDEX "Campaign_shop_status_idx" ON "Campaign"("shop", "status");
CREATE INDEX "Campaign_shop_placement_status_idx" ON "Campaign"("shop", "placement", "status");
CREATE TABLE "new_Discount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'NONE',
    "value" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Discount_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Discount" ("campaignId", "createdAt", "id", "shop", "type", "updatedAt", "value") SELECT "campaignId", "createdAt", "id", "shop", "type", "updatedAt", "value" FROM "Discount";
DROP TABLE "Discount";
ALTER TABLE "new_Discount" RENAME TO "Discount";
CREATE UNIQUE INDEX "Discount_campaignId_key" ON "Discount"("campaignId");
CREATE INDEX "Discount_shop_idx" ON "Discount"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
