/*
  Warnings:

  - Added the required column `updatedAt` to the `BuyerSRN` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BuyerSRN" (
    "saleRecordNumber" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "buyerId" TEXT NOT NULL,
    "kurasiShipmentId" TEXT,
    "trackingNumber" TEXT,
    "trackingSlug" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BuyerSRN_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BuyerSRN" ("buyerId", "createdAt", "saleRecordNumber") SELECT "buyerId", "createdAt", "saleRecordNumber" FROM "BuyerSRN";
DROP TABLE "BuyerSRN";
ALTER TABLE "new_BuyerSRN" RENAME TO "BuyerSRN";
CREATE INDEX "BuyerSRN_kurasiShipmentId_idx" ON "BuyerSRN"("kurasiShipmentId");
CREATE INDEX "BuyerSRN_trackingNumber_idx" ON "BuyerSRN"("trackingNumber");
CREATE INDEX "BuyerSRN_trackingSlug_idx" ON "BuyerSRN"("trackingSlug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
