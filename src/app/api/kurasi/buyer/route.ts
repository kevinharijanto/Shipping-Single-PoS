import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchKurasiPage, toBuyerInput, todayYMD } from "@/lib/kurasi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const token = process.env.KURASI_TOKEN || process.env.X_SHIP_AUTH_TOKEN;
  if (!token) return NextResponse.json({ error: "KURASI_TOKEN missing" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const {
    startDate = "2018-09-15",
    endDate = todayYMD(),
    index = 0,
    limit = 100,
    clientCode = process.env.KURASI_CLIENT_CODE || "K0016794",
  } = body || {};

  const { rows } = await fetchKurasiPage({
    startDate, endDate, index, limit,
    clientCode, sortType: "ASC", flagText: "All",
    saleRecordNumber: "", kurasiShipmentId: "",
    country: [], serviceName: [], saleChannel: [],
  });

  const results: any[] = [];
  for (const row of rows) {
    const buyer = toBuyerInput(row);
    if (!buyer) continue;

    const r = await prisma.buyer.upsert({
      where: { saleRecordNumber: buyer.saleRecordNumber },
      update: buyer,
      create: buyer,
      select: {
        id: true, saleRecordNumber: true, buyerFullName: true,
        buyerAddress1: true, buyerZip: true, buyerCountry: true
      },
    });
    results.push(r);
  }

  return NextResponse.json({
    insertedOrUpdated: results.length,
    window: { start: startDate, end: endDate },
    page: { index, limit },
    buyers: results,
  });
}
