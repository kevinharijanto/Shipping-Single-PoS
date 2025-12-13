// src/app/api/migrate-fees/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateFee } from "@/lib/feeCalculator";

export const dynamic = "force-dynamic";

/**
 * POST /api/migrate-fees
 * Backfills feeMinor for existing Orders and localFeeMinor for existing KurasiShipments.
 */
export async function POST() {
    try {
        // 1. Backfill Orders
        const orders = await prisma.order.findMany({
            where: { feeMinor: null },
            select: {
                id: true,
                buyer: { select: { buyerCountry: true } },
                package: { select: { weightGrams: true } },
            },
        });

        let ordersUpdated = 0;
        let orderFeesTotal = 0;
        for (const order of orders) {
            const weight = order.package?.weightGrams ?? 0;
            const country = order.buyer?.buyerCountry ?? "";
            const fee = calculateFee(weight, country);

            await prisma.order.update({
                where: { id: order.id },
                data: { feeMinor: fee },
            });
            ordersUpdated++;
            orderFeesTotal += fee;
        }

        // 2. Backfill KurasiShipments
        const shipments = await prisma.kurasiShipment.findMany({
            where: { localFeeMinor: null },
            select: {
                kurasiShipmentId: true,
                actualWeight: true,
                chargeableWeight: true,
                buyerCountry: true,
            },
        });

        let shipmentsUpdated = 0;
        let shipmentFeesTotal = 0;
        for (const shipment of shipments) {
            // Use chargeableWeight if available, otherwise actualWeight
            const weight = shipment.chargeableWeight ?? shipment.actualWeight ?? 0;
            const country = shipment.buyerCountry ?? "";
            const fee = calculateFee(weight, country);

            await prisma.kurasiShipment.update({
                where: { kurasiShipmentId: shipment.kurasiShipmentId },
                data: { localFeeMinor: fee },
            });
            shipmentsUpdated++;
            shipmentFeesTotal += fee;
        }

        // 3. Get totals from ALL data (including already migrated)
        const allOrderFees = await prisma.order.aggregate({
            _sum: { feeMinor: true },
            _count: true,
        });

        const allShipmentFees = await prisma.kurasiShipment.aggregate({
            _sum: { localFeeMinor: true },
            _count: true,
        });

        const grandTotal = (allOrderFees._sum.feeMinor || 0) + (allShipmentFees._sum.localFeeMinor || 0);

        return NextResponse.json({
            status: "SUCCESS",
            migrated: {
                ordersUpdated,
                orderFeesTotal,
                shipmentsUpdated,
                shipmentFeesTotal,
            },
            totals: {
                orders: {
                    count: allOrderFees._count,
                    totalFees: allOrderFees._sum.feeMinor || 0,
                    formatted: `Rp ${(allOrderFees._sum.feeMinor || 0).toLocaleString("id-ID")}`,
                },
                shipments: {
                    count: allShipmentFees._count,
                    totalFees: allShipmentFees._sum.localFeeMinor || 0,
                    formatted: `Rp ${(allShipmentFees._sum.localFeeMinor || 0).toLocaleString("id-ID")}`,
                },
                grandTotal: {
                    fees: grandTotal,
                    formatted: `Rp ${grandTotal.toLocaleString("id-ID")}`,
                },
            },
            message: `Migrated ${ordersUpdated} orders and ${shipmentsUpdated} KurasiShipments`,
        });
    } catch (error: any) {
        console.error("Migration error:", error);
        return NextResponse.json(
            { status: "ERROR", error: error.message || "Migration failed" },
            { status: 500 }
        );
    }
}
