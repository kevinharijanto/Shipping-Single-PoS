-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "placedAt" DATETIME NOT NULL,
    "notes" TEXT,
    "customerId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "quotedAmountMinor" INTEGER,
    "shippingPriceMinor" INTEGER,
    "currency" TEXT,
    "pricingSource" TEXT,
    "localStatus" TEXT NOT NULL DEFAULT 'in_progress',
    "deliveryStatus" TEXT NOT NULL DEFAULT 'not_yet_create_label',
    "paymentMethod" TEXT NOT NULL DEFAULT 'qris',
    "externalRef" TEXT,
    "srnId" INTEGER,
    "saleChannel" TEXT,
    "taxReference" TEXT,
    "taxNumber" TEXT,
    "labelId" TEXT,
    "trackingLink" TEXT,
    "krsTrackingNumber" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "PackageDetail" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Order_srnId_fkey" FOREIGN KEY ("srnId") REFERENCES "BuyerSRN" ("saleRecordNumber") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("buyerId", "createdAt", "currency", "customerId", "deliveryStatus", "externalRef", "id", "krsTrackingNumber", "labelId", "localStatus", "notes", "packageId", "paymentMethod", "placedAt", "pricingSource", "quotedAmountMinor", "shippingPriceMinor", "trackingLink", "updatedAt") SELECT "buyerId", "createdAt", "currency", "customerId", "deliveryStatus", "externalRef", "id", "krsTrackingNumber", "labelId", "localStatus", "notes", "packageId", "paymentMethod", "placedAt", "pricingSource", "quotedAmountMinor", "shippingPriceMinor", "trackingLink", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_packageId_key" ON "Order"("packageId");
CREATE UNIQUE INDEX "Order_srnId_key" ON "Order"("srnId");
CREATE INDEX "Order_placedAt_idx" ON "Order"("placedAt");
CREATE INDEX "Order_localStatus_deliveryStatus_idx" ON "Order"("localStatus", "deliveryStatus");
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");
CREATE INDEX "Order_buyerId_idx" ON "Order"("buyerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
