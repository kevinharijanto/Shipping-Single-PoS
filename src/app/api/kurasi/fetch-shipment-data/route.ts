// src/app/api/kurasi/fetch-shipment-data/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const { orderId } = await req.json();

        if (!orderId) {
            return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
        }

        // Get order with KRS tracking number
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: {
                id: true,
                krsTrackingNumber: true,
                srnId: true,
                packageId: true,
            },
        });

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        if (!order.krsTrackingNumber) {
            return NextResponse.json({ error: "Order has no KRS tracking number" }, { status: 400 });
        }

        // Get Kurasi auth token
        const cookieStore = await cookies();
        const token = cookieStore.get("kurasi_token")?.value || "";

        if (!token) {
            return NextResponse.json({ error: "Not logged in to Kurasi" }, { status: 401 });
        }

        // Fetch shipment data from Kurasi
        const base = process.env.KURASI_BASE ?? "https://api.kurasi.app";
        const res = await fetch(`${base}/api/v1/shipment/otherdata/${order.krsTrackingNumber}`, {
            headers: {
                "x-ship-auth-token": token,
                accept: "application/json",
            },
            cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok || data.status !== "SUCCESS") {
            return NextResponse.json(
                { error: data.errorMessage || "Failed to fetch shipment data from Kurasi" },
                { status: res.status }
            );
        }

        const shipmentData = data.data;
        if (!shipmentData) {
            return NextResponse.json({ error: "No shipment data returned" }, { status: 404 });
        }

        // Update order with tracking info
        const updateData: Record<string, any> = {};

        if (shipmentData.trackingNumber) {
            updateData.trackingLink = shipmentData.trackingLink || null;
        }

        // Update package details if available
        const pkgUpdate: Record<string, any> = {};
        if (shipmentData.chargeableWeight) {
            pkgUpdate.weightGrams = parseInt(shipmentData.chargeableWeight, 10);
        }

        // Update order
        if (Object.keys(updateData).length > 0) {
            await prisma.order.update({
                where: { id: orderId },
                data: updateData,
            });
        }

        // Update package if needed
        if (Object.keys(pkgUpdate).length > 0 && order.packageId) {
            await prisma.packageDetail.update({
                where: { id: order.packageId },
                data: pkgUpdate,
            });
        }

        // Update BuyerSRN with tracking info
        if (order.srnId && shipmentData.trackingNumber) {
            await prisma.buyerSRN.update({
                where: { saleRecordNumber: order.srnId },
                data: {
                    trackingNumber: shipmentData.trackingNumber,
                    trackingSlug: shipmentData.trackingList?.[0]?.slug || null,
                },
            });
        }

        return NextResponse.json({
            success: true,
            shipmentData,
            updated: {
                order: Object.keys(updateData).length > 0,
                package: Object.keys(pkgUpdate).length > 0,
                srn: !!order.srnId && !!shipmentData.trackingNumber,
            },
        });
    } catch (error: any) {
        console.error("Error fetching Kurasi shipment data:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch shipment data" },
            { status: 500 }
        );
    }
}
