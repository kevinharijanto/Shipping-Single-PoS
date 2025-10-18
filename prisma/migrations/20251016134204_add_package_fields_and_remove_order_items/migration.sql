/*
  Warnings:

  - You are about to drop the `OrderItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "PackageDetail" ADD COLUMN "countryOfOrigin" TEXT;
ALTER TABLE "PackageDetail" ADD COLUMN "currency" TEXT;
ALTER TABLE "PackageDetail" ADD COLUMN "hsCode" TEXT;
ALTER TABLE "PackageDetail" ADD COLUMN "sku" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "OrderItem";
PRAGMA foreign_keys=on;
