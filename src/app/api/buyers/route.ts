import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeCountryCode } from "@/lib/countryMapping";
import { normalizeAndSplitPhone } from "@/lib/phone";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "25", 10)));
    const qRaw = (url.searchParams.get("q") || "").trim();

    // Build WHERE
    let where: any = {};
    if (qRaw) {
      const isNum = /^\d+$/.test(qRaw);
      const srnFilter = isNum ? [{ saleRecordNumber: { equals: Number(qRaw) } }] : [];

      where = {
        OR: [
          { buyerFullName: { contains: qRaw } }, // SQLite LIKE is case-insensitive for ASCII
          { buyerCity: { contains: qRaw } },
          { buyerCountry: { contains: qRaw } },
          { buyerPhone: { contains: qRaw } },
          {
            srns: {
              some: {
                OR: [
                  ...srnFilter,
                  { kurasiShipmentId: { contains: qRaw } },
                  { trackingNumber: { contains: qRaw } },
                  { trackingSlug: { contains: qRaw } },
                ],
              },
            },
          },
        ],
      };
    }

    const [totalBuyers, totalSRN, totalFiltered, buyers] = await prisma.$transaction([
      prisma.buyer.count(),                   // overall count
      prisma.buyerSRN.count(),                // overall SRN count
      prisma.buyer.count({ where }),          // filtered count
      prisma.buyer.findMany({
        where,
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
        },
        orderBy: { buyerFullName: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
    return NextResponse.json({
      page,
      pageSize,
      totalPages,
      totalFiltered,
      totalBuyers,
      totalSRN,
      buyers,
    });
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
      phoneCode, // From form: "+1"
    } = body ?? {};

    // required checks (for Buyer)
    const missing =
      !buyerFullName || !buyerAddress1 || !buyerCity || !buyerZip ||
      !buyerCountry || !buyerPhone;
    if (missing) return NextResponse.json({ error: "Required fields are missing" }, { status: 400 });

    const iso2 = normalizeCountryCode(buyerCountry);
    if (!iso2) return NextResponse.json({ error: "Invalid country code" }, { status: 400 });

    // Build combined phone for parsing (same as Customer API)
    let phoneToNormalize = String(buyerPhone).trim();
    if (phoneCode && phoneToNormalize.startsWith("0")) {
      // Remove leading 0 and prepend country code
      const code = phoneCode.startsWith("+") ? phoneCode : `+${phoneCode}`;
      phoneToNormalize = `${code}${phoneToNormalize.slice(1)}`;
    } else if (phoneCode && !phoneToNormalize.startsWith("+")) {
      // No leading 0 but also no +, prepend country code
      const code = phoneCode.startsWith("+") ? phoneCode : `+${phoneCode}`;
      phoneToNormalize = `${code}${phoneToNormalize}`;
    }

    const parsed = normalizeAndSplitPhone(phoneToNormalize, iso2);
    if (!parsed) return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });

    // Upsert Buyer by (country, phone) - phoneCode removed from schema
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