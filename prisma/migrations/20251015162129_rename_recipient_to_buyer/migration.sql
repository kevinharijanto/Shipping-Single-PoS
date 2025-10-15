-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "shopeeName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Buyer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "buyerFullName" TEXT NOT NULL,
    "buyerAddress1" TEXT NOT NULL,
    "buyerAddress2" TEXT NOT NULL,
    "buyerCity" TEXT NOT NULL,
    "buyerState" TEXT NOT NULL,
    "buyerZip" TEXT NOT NULL,
    "buyerCountry" TEXT NOT NULL,
    "buyerPhone" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "placedAt" DATETIME NOT NULL,
    "notes" TEXT,
    "customerId" TEXT NOT NULL,
    "buyerId" INTEGER NOT NULL,
    "packageId" TEXT NOT NULL,
    "quotedAmountMinor" INTEGER,
    "currency" TEXT,
    "pricingSource" TEXT,
    "localStatus" TEXT NOT NULL DEFAULT 'on_the_way',
    "deliveryStatus" TEXT NOT NULL DEFAULT 'not_yet_create_label',
    "paymentMethod" TEXT NOT NULL DEFAULT 'qris',
    "externalRef" TEXT,
    "labelId" TEXT,
    "trackingLink" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "PackageDetail" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PackageDetail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weightGrams" INTEGER,
    "lengthCm" DECIMAL,
    "widthCm" DECIMAL,
    "heightCm" DECIMAL,
    "volumetricGrams" INTEGER,
    "service" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "valueMinor" INTEGER NOT NULL,
    "itemWeightGrams" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "sku" TEXT,
    "hsCode" TEXT,
    "countryOfOrigin" TEXT,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Buyer_buyerFullName_idx" ON "Buyer"("buyerFullName");

-- CreateIndex
CREATE UNIQUE INDEX "Buyer_buyerFullName_buyerAddress1_buyerZip_buyerCountry_key" ON "Buyer"("buyerFullName", "buyerAddress1", "buyerZip", "buyerCountry");

-- CreateIndex
CREATE UNIQUE INDEX "Order_packageId_key" ON "Order"("packageId");

-- CreateIndex
CREATE INDEX "Order_placedAt_idx" ON "Order"("placedAt");

-- CreateIndex
CREATE INDEX "Order_localStatus_deliveryStatus_idx" ON "Order"("localStatus", "deliveryStatus");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_buyerId_idx" ON "Order"("buyerId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
