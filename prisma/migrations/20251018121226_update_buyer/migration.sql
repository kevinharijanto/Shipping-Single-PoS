-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BuyerSRN" (
    "saleRecordNumber" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "buyerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BuyerSRN_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BuyerSRN" ("buyerId", "createdAt", "saleRecordNumber") SELECT "buyerId", "createdAt", "saleRecordNumber" FROM "BuyerSRN";
DROP TABLE "BuyerSRN";
ALTER TABLE "new_BuyerSRN" RENAME TO "BuyerSRN";
CREATE INDEX "BuyerSRN_buyerId_idx" ON "BuyerSRN"("buyerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
