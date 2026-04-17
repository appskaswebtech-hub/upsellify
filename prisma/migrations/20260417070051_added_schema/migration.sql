-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "installedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uninstalledAt" DATETIME,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "brandColor" TEXT NOT NULL DEFAULT '#000000',
    "buttonColor" TEXT NOT NULL DEFAULT '#000000',
    "buttonTextColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "fontFamily" TEXT NOT NULL DEFAULT 'inherit',
    "embedEnabled" BOOLEAN NOT NULL DEFAULT false,
    "firstCampaignCreated" BOOLEAN NOT NULL DEFAULT false,
    "storeVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "placement" TEXT NOT NULL,
    "priority" INTEGER,
    "startDate" DATETIME,
    "startTimezone" TEXT DEFAULT 'America/New_York',
    "endDate" DATETIME,
    "triggerType" TEXT NOT NULL DEFAULT 'SPECIFIC_PRODUCTS',
    "offerMode" TEXT NOT NULL DEFAULT 'MANUAL',
    "showQuantityPicker" BOOLEAN NOT NULL DEFAULT false,
    "allowDeselectTrigger" BOOLEAN NOT NULL DEFAULT false,
    "doNotPreselectItems" BOOLEAN NOT NULL DEFAULT false,
    "randomizeOfferOrder" BOOLEAN NOT NULL DEFAULT false,
    "limitOfferedProducts" INTEGER,
    "autoMatchVariants" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT,
    "subtitle" TEXT,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Campaign_shop_fkey" FOREIGN KEY ("shop") REFERENCES "Shop" ("shop") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignTrigger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceTitle" TEXT NOT NULL,
    "resourceHandle" TEXT,
    "imageUrl" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "CampaignTrigger_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignOffer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "productHandle" TEXT,
    "imageUrl" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "CampaignOffer_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "campaignId" TEXT,
    "eventType" TEXT NOT NULL,
    "sessionId" TEXT,
    "productId" TEXT,
    "orderId" TEXT,
    "revenue" REAL,
    "currency" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsEvent_shop_fkey" FOREIGN KEY ("shop") REFERENCES "Shop" ("shop") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AnalyticsEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebhookLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Shop_shop_key" ON "Shop"("shop");

-- CreateIndex
CREATE INDEX "Campaign_shop_status_idx" ON "Campaign"("shop", "status");

-- CreateIndex
CREATE INDEX "Campaign_shop_placement_status_idx" ON "Campaign"("shop", "placement", "status");

-- CreateIndex
CREATE INDEX "Campaign_shop_type_idx" ON "Campaign"("shop", "type");

-- CreateIndex
CREATE INDEX "CampaignTrigger_campaignId_idx" ON "CampaignTrigger"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignTrigger_resourceId_idx" ON "CampaignTrigger"("resourceId");

-- CreateIndex
CREATE INDEX "CampaignOffer_campaignId_idx" ON "CampaignOffer"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "Discount_campaignId_key" ON "Discount"("campaignId");

-- CreateIndex
CREATE INDEX "Discount_shop_idx" ON "Discount"("shop");

-- CreateIndex
CREATE INDEX "DiscountTier_discountId_idx" ON "DiscountTier"("discountId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_shop_campaignId_eventType_idx" ON "AnalyticsEvent"("shop", "campaignId", "eventType");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_shop_createdAt_idx" ON "AnalyticsEvent"("shop", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_shop_eventType_createdAt_idx" ON "AnalyticsEvent"("shop", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookLog_shop_topic_idx" ON "WebhookLog"("shop", "topic");
