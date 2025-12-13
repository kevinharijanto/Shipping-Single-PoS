// src/app/api/kurasi/shipments-stats/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const total = await prisma.kurasiShipment.count();

        const feeSum = await prisma.kurasiShipment.aggregate({
            _sum: { shippingFeeMinor: true, localFeeMinor: true },
        });

        const byCountry = await prisma.kurasiShipment.groupBy({
            by: ["buyerCountry"],
            _count: { buyerCountry: true },
            orderBy: { _count: { buyerCountry: "desc" } },
        });

        const byService = await prisma.kurasiShipment.groupBy({
            by: ["serviceName"],
            _count: { serviceName: true },
            orderBy: { _count: { serviceName: "desc" } },
        });

        const recent = await prisma.kurasiShipment.findMany({
            orderBy: { syncedAt: "desc" },
            take: 10,
        });

        return NextResponse.json({
            total,
            totalFees: feeSum._sum.shippingFeeMinor || 0,
            totalLocalFees: feeSum._sum.localFeeMinor || 0,
            byCountry: byCountry.map((c) => ({ country: c.buyerCountry, count: c._count.buyerCountry })),
            byService: byService.map((s) => ({ service: s.serviceName || "Unknown", count: s._count.serviceName })),
            recent,
        });
    } catch (e) {
        console.error("Stats error:", e);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
