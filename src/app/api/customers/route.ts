// src/app/api/customers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeAndSplitPhone } from "@/lib/phone";

// GET /api/customers?page=1&pageSize=25&q=...
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const page     = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "25", 10)));
    const qRaw     = (url.searchParams.get("q") || "").trim();

    let where: any = {};
    if (qRaw) {
      where = {
        OR: [
          { name:       { contains: qRaw } },  // SQLite LIKE: case-insensitive for ASCII
          { shopeeName: { contains: qRaw } },
          { phone:      { contains: qRaw } },
        ],
      };
    }

    const [totalCustomers, totalFiltered, customers] = await prisma.$transaction([
      prisma.customer.count(),                 // overall count
      prisma.customer.count({ where }),        // filtered count
      prisma.customer.findMany({
        where,
        include: {
          _count: { select: { orders: true } },
        },
        orderBy: { name: "asc" },
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
      totalCustomers,
      customers,
    });
  } catch (e) {
    console.error("GET /api/customers error", e);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}

// POST /api/customers
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      name,
      phone,        // raw user-entered phone
      phoneCode,    // optional, e.g. "+62"
      shopeeName,   // optional
      // If you want to accept country for parsing, you could add: country?: string
    } = body ?? {};

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
    }

    // Try to normalize into E.164 using phoneCode as a hint (when provided)
    // normalizeAndSplitPhone(phone, countryIso2?) expects ISO2, but if your helper
    // supports just raw E.164 parsing, you can pass null/undefined.
    // If your helper *requires* ISO2, you may derive it from the phoneCode externally.
    const parsed = normalizeAndSplitPhone(String(phone), undefined);
    if (!parsed) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    // Prefer parsed.phoneCode (from lib) over inbound phoneCode; fallback to inbound
    const resolvedPhoneCode = parsed.phoneCode || phoneCode || "+62";

    // Upsert by E.164 phone (unique)
    const customer = await prisma.customer.upsert({
      where: { phone: parsed.e164 },
      update: {
        name,
        phoneCode: resolvedPhoneCode,
        shopeeName: shopeeName ?? null,
      },
      create: {
        name,
        phone: parsed.e164,
        phoneCode: resolvedPhoneCode,
        shopeeName: shopeeName ?? null,
      },
      include: {
        _count: { select: { orders: true } },
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (e: any) {
    // Unique constraint hit (phone)
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Customer with this phone already exists" }, { status: 409 });
    }
    console.error("POST /api/customers error", e);
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}
