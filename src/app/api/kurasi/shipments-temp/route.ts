// src/app/api/kurasi/shipments-temp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const base = process.env.KURASI_BASE ?? "https://api.kurasi.app";
    const jar = await cookies();
    const token = jar.get("kurasi_token")?.value || "";

    if (!token) {
        return NextResponse.json({ status: "FAIL", errorMessage: "Not logged in" }, { status: 401 });
    }

    // Get clientCode from /me
    let clientCode = "";
    try {
        const meRes = await fetch(`${base}/api/v1/me`, {
            headers: { "x-ship-auth-token": token, accept: "application/json" },
            cache: "no-store",
        });
        const meData = await meRes.json();
        clientCode = meData?.data?.clientCode || "";
    } catch {
        return NextResponse.json({ status: "FAIL", errorMessage: "Failed to get user info" }, { status: 500 });
    }

    if (!clientCode) {
        return NextResponse.json({ status: "FAIL", errorMessage: "No clientCode found" }, { status: 400 });
    }

    // Parse request for date range
    const body = await req.json().catch(() => ({}));
    const today = new Date();
    const startDate = body.startDate || new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const endDate = body.endDate || today.toISOString().split("T")[0];

    try {
        const r = await fetch(`${base}/api/v1/shipmentTemp`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-ship-auth-token": token,
                accept: "application/json",
            },
            body: JSON.stringify({
                startDate,
                endDate,
                clientCode,
                sortType: "ASC",
                shipmentStatus: "All",
                saleRecordNumber: "",
                kurasiShipmentId: "",
                country: [],
                serviceName: [],
                countryList: [],
                saleChannel: [],
                branchIdList: [],
            }),
            cache: "no-store",
        });

        const j = await r.json();
        return NextResponse.json(j, { status: r.status });
    } catch {
        return NextResponse.json({ status: "ERROR", errorMessage: "Failed to fetch temp shipments" }, { status: 500 });
    }
}
