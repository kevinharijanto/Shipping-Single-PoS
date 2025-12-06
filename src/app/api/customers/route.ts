// src/app/api/customers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeAndSplitPhone } from "@/lib/phone";

// GET /api/customers?page=1&pageSize=25&q=...
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "25", 10)));
    const qRaw = (url.searchParams.get("q") || "").trim();

    let where: any = {};
    if (qRaw) {
      where = {
        OR: [
          { name: { contains: qRaw } },  // SQLite LIKE: case-insensitive for ASCII
          { shopeeName: { contains: qRaw } },
          { phone: { contains: qRaw } },
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

    // Build combined phone for parsing
    // If user provided phoneCode (e.g., "+62") and phone starts with 0 (local format),
    // combine them: +62 + 8111280720 (remove leading 0) = +628111280720
    let phoneToNormalize = String(phone).trim();
    if (phoneCode && phoneToNormalize.startsWith("0")) {
      // Remove leading 0 and prepend country code
      const code = phoneCode.startsWith("+") ? phoneCode : `+${phoneCode}`;
      phoneToNormalize = `${code}${phoneToNormalize.slice(1)}`;
    } else if (phoneCode && !phoneToNormalize.startsWith("+")) {
      // No leading 0 but also no +, prepend country code
      const code = phoneCode.startsWith("+") ? phoneCode : `+${phoneCode}`;
      phoneToNormalize = `${code}${phoneToNormalize}`;
    }

    // Try to normalize into E.164
    const parsed = normalizeAndSplitPhone(phoneToNormalize, "ID");
    if (!parsed) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    // Use parsed phoneCode or fallback to provided (for logging/display, not stored)
    // const resolvedPhoneCode = parsed.phoneCode || phoneCode || "+62";

    // Upsert by E.164 phone (unique) - phoneCode removed from schema
    const customer = await prisma.customer.upsert({
      where: { phone: parsed.e164 },
      update: {
        name,
        shopeeName: shopeeName ?? null,
      },
      create: {
        name,
        phone: parsed.e164,
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
