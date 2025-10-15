/*
  Warnings:

  - Added the required column `saleRecordNumber` to the `Buyer` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Buyer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "saleRecordNumber" TEXT NOT NULL,
    "buyerFullName" TEXT NOT NULL,
    "buyerAddress1" TEXT NOT NULL,
    "buyerAddress2" TEXT NOT NULL,
    "buyerCity" TEXT NOT NULL,
    "buyerState" TEXT NOT NULL,
    "buyerZip" TEXT NOT NULL,
    "buyerCountry" TEXT NOT NULL,
    "buyerPhone" TEXT NOT NULL
);
INSERT INTO "new_Buyer" ("buyerAddress1", "buyerAddress2", "buyerCity", "buyerCountry", "buyerFullName", "buyerPhone", "buyerState", "buyerZip", "id") SELECT "buyerAddress1", "buyerAddress2", "buyerCity", "buyerCountry", "buyerFullName", "buyerPhone", "buyerState", "buyerZip", "id" FROM "Buyer";
DROP TABLE "Buyer";
ALTER TABLE "new_Buyer" RENAME TO "Buyer";
CREATE UNIQUE INDEX "Buyer_saleRecordNumber_key" ON "Buyer"("saleRecordNumber");
CREATE INDEX "Buyer_buyerFullName_idx" ON "Buyer"("buyerFullName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
