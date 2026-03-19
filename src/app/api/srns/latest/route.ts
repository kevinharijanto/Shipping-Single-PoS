import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { fetchKurasiPage } from "@/lib/kurasi";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const jar = await cookies();
    const token = jar.get("kurasi_token")?.value;

    let latestDateMs = 0;
    let latestSrn = 0;

    const consider = (srnValue: any, dateString: any) => {
        const s = Number(String(srnValue || "").trim());
        if (Number.isFinite(s) && s > 0 && s < 10000000) {
            let ms = 0;
            if (dateString instanceof Date) {
                 ms = dateString.getTime();
            } else if (typeof dateString === "string") {
                 // Kurasi dates are often "2026/03/17 14:38:31" or "2026-03-17 14:38:31"
                 ms = new Date(dateString.replace(/\//g, "-")).getTime();
            }
            if (Number.isFinite(ms) && ms > latestDateMs) {
                 latestDateMs = ms;
                 latestSrn = s;
            }
        }
    };

    // 1. Get latest from local DB table buyerSRN
    const latestLocalDB = await prisma.buyerSRN.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { saleRecordNumber: true, createdAt: true }
    });
    if (latestLocalDB) {
        consider(latestLocalDB.saleRecordNumber, latestLocalDB.createdAt);
    }
    
    // Also check the order table
    const latestLocalOrder = await prisma.order.findFirst({
        where: { srnId: { not: null } },
        orderBy: { createdAt: 'desc' },
        select: { srnId: true, createdAt: true }
    });
    if (latestLocalOrder?.srnId) {
        consider(latestLocalOrder.srnId, latestLocalOrder.createdAt);
    }

    if (!token) {
        return NextResponse.json({ latestSrn });
    }

    const today = new Date();
    // fetch last 60 days
    const startDate = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const endDate = today.toISOString().split("T")[0];

    // 2. Fetch from shipmentManagement
    try {
        const page = await fetchKurasiPage({
            startDate,
            endDate,
            index: 0,
            limit: 200, // Fetch recent ones
            sortType: "DESC", // Try to get newest first
            token
        });

        if (page && page.rows) {
            for (const r of page.rows) {
                // Find the best proxy for created date: paymentClearDatetime, labelCreatedDatetime, or simply shipmentReceivedDatetime
                const dateStr = r.labelCreatedDatetime || r.handoverReceivedDatetime || r.shipmentReceivedDatetime || r.paymentClearDatetime;
                if (dateStr) {
                    consider(r.saleRecordNumber, dateStr);
                }
            }
        }
    } catch (e) {
        console.error("Failed to fetch shipmentManagement for latest SRN", e);
    }

    // 3. Fetch from shipmentTemp
    const base = process.env.KURASI_BASE ?? "https://api.kurasi.app";
    try {
        const userAgent = req.headers.get("user-agent") || "Mozilla/5.0";
        const meRes = await fetch(`${base}/api/v1/me`, {
            headers: {
                "x-ship-auth-token": token,
                accept: "application/json",
                "User-Agent": userAgent,
            },
            cache: "no-store",
        });
        const meData = await meRes.json();
        const clientCode = meData?.data?.clientCode || "";

        if (clientCode) {
            const rTemp = await fetch(`${base}/api/v1/shipmentTemp`, {
                method: "POST",
                headers: {
                    "x-ship-auth-token": token,
                    accept: "application/json",
                    "User-Agent": userAgent,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    startDate,
                    endDate,
                    clientCode,
                    sortType: "DESC",
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
            const jTemp = await rTemp.json();
            if (jTemp.status === "SUCCESS" && Array.isArray(jTemp.data)) {
                for (const r of jTemp.data) {
                    consider(r.saleRecordNumber, r.createdDate || r.updatedDate);
                }
            }
        }
    } catch (e) {
        console.error("Failed to fetch shipmentTemp for latest SRN", e);
    }

    // If latestDate logic didn't catch anything due to missing dates, fallback to max locally
    if (latestSrn === 0 && latestLocalDB) {
        latestSrn = latestLocalDB.saleRecordNumber;
    }

    return NextResponse.json({ latestSrn });

  } catch (e: any) {
    console.error("GET /api/srns/latest error:", e);
    return NextResponse.json({ error: "Failed to get latest SRN" }, { status: 500 });
  }
}
