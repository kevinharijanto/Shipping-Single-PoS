/*
  Warnings:

  - A unique constraint covering the columns `[kurasiShipmentId]` on the table `BuyerSRN` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "BuyerSRN_kurasiShipmentId_key" ON "BuyerSRN"("kurasiShipmentId");
