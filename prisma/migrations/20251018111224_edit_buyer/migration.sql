/*
  Warnings:

  - The primary key for the `Buyer` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `saleRecordNumber` on the `Buyer` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - Added the required column `buyerEmail` to the `Buyer` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Buyer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleRecordNumber" INTEGER NOT NULL,
    "buyerFullName" TEXT NOT NULL,
    "buyerAddress1" TEXT NOT NULL,
    "buyerAddress2" TEXT NOT NULL,
    "buyerCity" TEXT NOT NULL,
    "buyerState" TEXT NOT NULL,
    "buyerZip" TEXT NOT NULL,
    "buyerCountry" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "phoneCode" TEXT NOT NULL DEFAULT '',
    "buyerPhone" TEXT NOT NULL
);
INSERT INTO "new_Buyer" ("buyerAddress1", "buyerAddress2", "buyerCity", "buyerCountry", "buyerFullName", "buyerPhone", "buyerState", "buyerZip", "id", "phoneCode", "saleRecordNumber") SELECT "buyerAddress1", "buyerAddress2", "buyerCity", "buyerCountry", "buyerFullName", "buyerPhone", "buyerState", "buyerZip", "id", "phoneCode", "saleRecordNumber" FROM "Buyer";
DROP TABLE "Buyer";
ALTER TABLE "new_Buyer" RENAME TO "Buyer";
CREATE UNIQUE INDEX "Buyer_saleRecordNumber_key" ON "Buyer"("saleRecordNumber");
CREATE INDEX "Buyer_saleRecordNumber_idx" ON "Buyer"("saleRecordNumber");
CREATE INDEX "Buyer_buyerFullName_idx" ON "Buyer"("buyerFullName");
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
    "labelId" TEXT,
    "trackingLink" TEXT,
    "krsTrackingNumber" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "PackageDetail" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("buyerId", "createdAt", "currency", "customerId", "deliveryStatus", "externalRef", "id", "krsTrackingNumber", "labelId", "localStatus", "notes", "packageId", "paymentMethod", "placedAt", "pricingSource", "quotedAmountMinor", "shippingPriceMinor", "trackingLink", "updatedAt") SELECT "buyerId", "createdAt", "currency", "customerId", "deliveryStatus", "externalRef", "id", "krsTrackingNumber", "labelId", "localStatus", "notes", "packageId", "paymentMethod", "placedAt", "pricingSource", "quotedAmountMinor", "shippingPriceMinor", "trackingLink", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_packageId_key" ON "Order"("packageId");
CREATE INDEX "Order_placedAt_idx" ON "Order"("placedAt");
CREATE INDEX "Order_localStatus_deliveryStatus_idx" ON "Order"("localStatus", "deliveryStatus");
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");
CREATE INDEX "Order_buyerId_idx" ON "Order"("buyerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
