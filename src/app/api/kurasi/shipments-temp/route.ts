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

    // Cloudflare WAF bypass headers
    const userAgent = req.headers.get("user-agent") || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";
    const xForwardedFor = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";

    const baseHeaders: Record<string, string> = {
        "x-ship-auth-token": token,
        accept: "application/json",
        "User-Agent": userAgent,
    };
    if (xForwardedFor) baseHeaders["X-Forwarded-For"] = xForwardedFor;

    // Get clientCode from /me
    let clientCode = "";
    try {
        const meRes = await fetch(`${base}/api/v1/me`, {
            headers: baseHeaders,
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
                ...baseHeaders,
                "Content-Type": "application/json",
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
