import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeCountryCode } from "@/lib/countryMapping";
import { normalizeAndSplitPhone } from "@/lib/phone";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const withOrders = url.searchParams.get("withOrders") === "1";

    const [totalBuyers, totalSRN, buyers] = await prisma.$transaction([
      prisma.buyer.count(),
      prisma.buyerSRN.count(),
      prisma.buyer.findMany({
        include: {
          _count: { select: { orders: true } },
          srns: {
            select: {
              saleRecordNumber: true,
              kurasiShipmentId: true,
              trackingNumber: true,
              trackingSlug: true,
            },
            orderBy: { saleRecordNumber: "asc" },
          },
          ...(withOrders && {
            orders: {
              orderBy: { createdAt: "desc" },
              select: { id: true, createdAt: true },
            },
          }),
        },
        orderBy: { buyerFullName: "asc" },
      }),
    ]);

    return NextResponse.json({ totalBuyers, totalSRN, buyers });
  } catch (e) {
    console.error("GET /api/buyers error", e);
    return NextResponse.json({ error: "Failed to fetch buyers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      saleRecordNumber,
      buyerFullName,
      buyerAddress1,
      buyerAddress2,
      buyerCity,
      buyerState,
      buyerZip,
      buyerCountry,
      buyerEmail,
      buyerPhone,
    } = body ?? {};

    // required checks (for Buyer)
    const missing =
      !buyerFullName || !buyerAddress1 || !buyerCity || !buyerZip ||
      !buyerCountry || !buyerPhone;
    if (missing) return NextResponse.json({ error: "Required fields are missing" }, { status: 400 });

    const iso2 = normalizeCountryCode(buyerCountry);
    if (!iso2) return NextResponse.json({ error: "Invalid country code" }, { status: 400 });

    const parsed = normalizeAndSplitPhone(buyerPhone, iso2);
    if (!parsed) return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });

    // Upsert Buyer by (country, phone)
    const buyer = await prisma.buyer.upsert({
      where: { buyerCountry_buyerPhone: { buyerCountry: iso2, buyerPhone: parsed.e164 } },
      update: {
        buyerFullName,
        buyerAddress1,
        buyerAddress2: buyerAddress2 ?? "",
        buyerCity,
        buyerState: buyerState ?? "",
        buyerZip,
        buyerEmail: (buyerEmail ?? "").toLowerCase().trim(),
        phoneCode: parsed.phoneCode,
      },
      create: {
        buyerFullName,
        buyerAddress1,
        buyerAddress2: buyerAddress2 ?? "",
        buyerCity,
        buyerState: buyerState ?? "",
        buyerZip,
        buyerCountry: iso2,
        buyerEmail: (buyerEmail ?? "").toLowerCase().trim(),
        buyerPhone: parsed.e164,
        phoneCode: parsed.phoneCode,
      },
    });

    // Optionally attach SRN
    if (saleRecordNumber != null) {
      await prisma.buyerSRN.upsert({
        where: { saleRecordNumber },
        update: { buyerId: buyer.id },
        create: { saleRecordNumber, buyerId: buyer.id },
      });
    }

    return NextResponse.json(buyer, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create buyer" }, { status: 500 });
  }
}