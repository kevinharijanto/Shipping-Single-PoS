/*
  Warnings:

  - You are about to drop the column `saleRecordNumber` on the `Buyer` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "BuyerSRN" (
    "saleRecordNumber" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "buyerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BuyerSRN_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Buyer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buyerFullName" TEXT NOT NULL,
    "buyerAddress1" TEXT NOT NULL,
    "buyerAddress2" TEXT NOT NULL,
    "buyerCity" TEXT NOT NULL,
    "buyerState" TEXT NOT NULL,
    "buyerZip" TEXT NOT NULL,
    "buyerCountry" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "buyerPhone" TEXT NOT NULL,
    "phoneCode" TEXT NOT NULL DEFAULT ''
);
INSERT INTO "new_Buyer" ("buyerAddress1", "buyerAddress2", "buyerCity", "buyerCountry", "buyerEmail", "buyerFullName", "buyerPhone", "buyerState", "buyerZip", "id", "phoneCode") SELECT "buyerAddress1", "buyerAddress2", "buyerCity", "buyerCountry", "buyerEmail", "buyerFullName", "buyerPhone", "buyerState", "buyerZip", "id", "phoneCode" FROM "Buyer";
DROP TABLE "Buyer";
ALTER TABLE "new_Buyer" RENAME TO "Buyer";
CREATE INDEX "Buyer_buyerEmail_idx" ON "Buyer"("buyerEmail");
CREATE INDEX "Buyer_buyerFullName_buyerCity_idx" ON "Buyer"("buyerFullName", "buyerCity");
CREATE UNIQUE INDEX "Buyer_buyerCountry_buyerPhone_key" ON "Buyer"("buyerCountry", "buyerPhone");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "BuyerSRN_buyerId_idx" ON "BuyerSRN"("buyerId");
