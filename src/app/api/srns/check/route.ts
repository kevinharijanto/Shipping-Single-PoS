import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic"; // don't cache

// GET /api/srns/check?srn=12345
// Optional: ?excludeBuyerId=<buyerId>  -> ignore SRNs attached to this buyer (useful when editing)
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

    // SRN is unique (there's a unique constraint on buyerSRN.saleRecordNumber).
    // If excludeBuyerId is provided, we ignore a match that belongs to that buyer (useful when editing).
    const found = await prisma.buyerSRN.findUnique({
      where: { saleRecordNumber: srn },
      select: { buyerId: true, saleRecordNumber: true },
    });

    const exists =
      !!found && (!excludeBuyerId || found.buyerId !== excludeBuyerId);

    return NextResponse.json({ exists, srn });
  } catch (e) {
    console.error("GET /api/srns/check error:", e);
    return NextResponse.json({ error: "Failed to check SRN" }, { status: 500 });
  }
}
