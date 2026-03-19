import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { fetchKurasiPage } from "@/lib/kurasi";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const jar = await cookies();
    const token = jar.get("kurasi_token")?.value;

    // 1. Get max from local DB table buyerSRN (ignore tracking numbers masquerading as SRN)
    const maxLocalDB = await prisma.buyerSRN.aggregate({
      _max: { saleRecordNumber: true },
      where: { saleRecordNumber: { lt: 10000 } }
    });
    let maxSrn = maxLocalDB._max.saleRecordNumber || 0;
    
    // Also check the order table, just in case there are orders without buyerSRN yet
    const maxLocalOrder = await prisma.order.aggregate({
        _max: { srnId: true },
        where: { srnId: { lt: 10000 } }
    });
    if (maxLocalOrder._max.srnId && maxLocalOrder._max.srnId > maxSrn) {
        maxSrn = maxLocalOrder._max.srnId;
    }

    if (!token) {
        return NextResponse.json({ latestSrn: maxSrn });
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
            limit: 500,
            token
        });

        if (page && page.rows) {
            for (const r of page.rows) {
                const s = Number(String(r.saleRecordNumber || "").trim());
                if (Number.isFinite(s) && s > maxSrn && s < 10000) {
                    maxSrn = s;
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
            const jTemp = await rTemp.json();
            if (jTemp.status === "SUCCESS" && Array.isArray(jTemp.data)) {
                for (const r of jTemp.data) {
                    const s = Number(String(r.saleRecordNumber || "").trim());
                    if (Number.isFinite(s) && s > maxSrn && s < 10000) {
                        maxSrn = s;
                    }
                }
            }
        }
    } catch (e) {
        console.error("Failed to fetch shipmentTemp for latest SRN", e);
    }

    return NextResponse.json({ latestSrn: maxSrn });

  } catch (e: any) {
    console.error("GET /api/srns/latest error:", e);
    return NextResponse.json({ error: "Failed to get latest SRN" }, { status: 500 });
  }
}
