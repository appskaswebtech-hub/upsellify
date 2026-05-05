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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "AnalyticsEvent_shop_campaignId_eventType_idx" ON "AnalyticsEvent"("shop", "campaignId", "eventType");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_shop_createdAt_idx" ON "AnalyticsEvent"("shop", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_shop_eventType_createdAt_idx" ON "AnalyticsEvent"("shop", "eventType", "createdAt");
