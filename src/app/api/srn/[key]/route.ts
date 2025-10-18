import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ key: string }> } // 👈 async params
) {
  try {
    const { key } = await ctx.params; // 👈 await it
    const raw = key.trim();
    const isKrs = /^KRS/i.test(raw);

    if (!isKrs && !Number.isFinite(Number(raw))) {
      return NextResponse.json(
        { error: "Invalid key. Use numeric SRN or a KRS… id." },
        { status: 400 }
      );
    }

    const where = isKrs ? { kurasiShipmentId: raw } : { saleRecordNumber: Number(raw) };

    const srn = await prisma.buyerSRN.findFirst({
      where,
      select: {
        saleRecordNumber: true,
        kurasiShipmentId: true,
        trackingNumber: true,
        trackingSlug: true,
        buyer: {
          select: {
            id: true,
            buyerFullName: true,
            buyerCountry: true,
            buyerPhone: true,
            buyerEmail: true,
            buyerAddress1: true,
            buyerAddress2: true,
            buyerCity: true,
            buyerState: true,
            buyerZip: true,
            phoneCode: true,
          },
        },
      },
    });

    if (!srn) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      saleRecordNumber: srn.saleRecordNumber,
      kurasiShipmentId: srn.kurasiShipmentId,
      trackingNumber: srn.trackingNumber,
      trackingSlug: srn.trackingSlug,
      buyer: srn.buyer,
    });
  } catch (e) {
    console.error("GET /api/srn/[key] error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
