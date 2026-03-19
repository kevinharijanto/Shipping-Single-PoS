import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { fetchKurasiPage } from "@/lib/kurasi";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const srnRaw = (url.searchParams.get("srn") || "").trim();
    const excludeBuyerId = url.searchParams.get("excludeBuyerId") || undefined;

    if (!srnRaw) {
      return NextResponse.json({ error: "srn is required" }, { status: 400 });
    }
    if (!/^\d+$/.test(srnRaw)) {
      return NextResponse.json({ error: "SRN must be numeric" }, { status: 400 });
    }

    const srn = parseInt(srnRaw, 10);
    if (!Number.isSafeInteger(srn) || srn <= 0) {
      return NextResponse.json({ error: "Invalid SRN number" }, { status: 400 });
    }

    // 1. Check local DB (buyerSRN table)
    const foundBuyerSrn = await prisma.buyerSRN.findUnique({
      where: { saleRecordNumber: srn },
      select: { buyerId: true, saleRecordNumber: true },
    });
    if (foundBuyerSrn && (!excludeBuyerId || foundBuyerSrn.buyerId !== excludeBuyerId)) {
        return NextResponse.json({ exists: true, srn });
    }

    // 2. Check local DB (order table) - Just in case it's reserved there but missing buyerSRN
    const foundOrder = await prisma.order.findFirst({
        where: { srnId: srn },
        select: { id: true }
    });
    if (foundOrder) {
        return NextResponse.json({ exists: true, srn });
    }

    // 3. Check Kurasi APIs
    const jar = await cookies();
    const token = jar.get("kurasi_token")?.value;

    if (token) {
        const today = new Date();
        const startDate = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const endDate = today.toISOString().split("T")[0];
        const srnString = String(srn);

        // 3a. Check shipmentManagement (historical)
        try {
            const page = await fetchKurasiPage({
                startDate,
                endDate,
                index: 0,
                limit: 50,
                saleRecordNumber: srnString,
                token
            });
            if (page && page.rows) {
                if (page.rows.some((r: any) => String(r.saleRecordNumber).trim() === srnString)) {
                    return NextResponse.json({ exists: true, srn });
                }
            }
        } catch (e) {
            console.error("Failed to check Kurasi shipmentManagement for SRN", e);
        }

        // 3b. Check shipmentTemp (pending)
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
                        saleRecordNumber: srnString,
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
                    if (jTemp.data.some((r: any) => String(r.saleRecordNumber).trim() === srnString)) {
                        return NextResponse.json({ exists: true, srn });
                    }
                }
            }
        } catch (e) {
            console.error("Failed to check Kurasi shipmentTemp for SRN", e);
        }
    }

    return NextResponse.json({ exists: false, srn });
  } catch (e) {
    console.error("GET /api/srns/check error:", e);
    return NextResponse.json({ error: "Failed to check SRN" }, { status: 500 });
  }
}
