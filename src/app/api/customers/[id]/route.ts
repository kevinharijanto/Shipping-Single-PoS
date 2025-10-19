// src/app/api/customers/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeAndSplitPhone } from "@/lib/phone";

// GET /api/customers/[id]
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    return NextResponse.json(customer);
  } catch (e) {
    console.error("GET /api/customers/[id] error", e);
    return NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 });
  }
}

// PUT /api/customers/[id]
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

    const { name, phone, phoneCode, shopeeName } = body ?? {};
    if (!name || !phone) {
      return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
    }

    const parsed = normalizeAndSplitPhone(String(phone), undefined);
    if (!parsed) return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });

    const resolvedPhoneCode = parsed.phoneCode || phoneCode || "+62";

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name,
        phone: parsed.e164,
        phoneCode: resolvedPhoneCode,
        shopeeName: shopeeName ?? null,
      },
      include: {
        _count: { select: { orders: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Another customer already uses this phone" }, { status: 409 });
    }
    if (e?.code === "P2025") {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    console.error("PUT /api/customers/[id] error", e);
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}

// DELETE /api/customers/[id]
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;

    // Guard: prevent delete if there are orders? (optional)
    const c = await prisma.customer.findUnique({
      where: { id },
      select: { _count: { select: { orders: true } } },
    });
    if (!c) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    if (c._count.orders > 0) {
      return NextResponse.json(
        { error: "Cannot delete customer with existing orders" },
        { status: 409 }
      );
    }

    await prisma.customer.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("DELETE /api/customers/[id] error", e);
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
  }
}
