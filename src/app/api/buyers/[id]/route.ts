import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeCountryCode } from "@/lib/countryMapping";
import { normalizeAndSplitPhone } from "@/lib/phone";

// GET /api/buyers/[id]?withOrders=1
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params; // Next 15: params is a Promise
    const url = new URL(req.url);
    const withOrders = url.searchParams.get("withOrders") === "1";

    const buyer = await prisma.buyer.findUnique({
      where: { id },
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
            orderBy: { placedAt: "desc" },
            include: { customer: true, package: true },
          },
        }),
      },
    });

    if (!buyer) {
      return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
    }

    // Explicit serializer: guarantees createdAt/updatedAt are present as ISO strings
    const payload: any = {
      id: buyer.id,
      buyerFullName: buyer.buyerFullName,
      buyerAddress1: buyer.buyerAddress1,
      buyerAddress2: buyer.buyerAddress2 ?? "",
      buyerCity: buyer.buyerCity,
      buyerState: buyer.buyerState ?? "",
      buyerZip: buyer.buyerZip,
      buyerCountry: buyer.buyerCountry,
      buyerEmail: buyer.buyerEmail ?? "",
      buyerPhone: buyer.buyerPhone,
      _count: buyer._count,
      srns: buyer.srns,
      createdAt: (buyer as any).createdAt?.toISOString?.() ?? null,
      updatedAt: (buyer as any).updatedAt?.toISOString?.() ?? null,
    };

    if (withOrders) {
      payload.orders = buyer.orders;
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error("GET /api/buyers/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch buyer" }, { status: 500 });
  }
}

// PUT /api/buyers/[id]
export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const {
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

    const requiredMissing =
      !buyerFullName || !buyerAddress1 || !buyerCity || !buyerZip || !buyerCountry || !buyerPhone;
    if (requiredMissing) {
      return NextResponse.json({ error: "Required fields are missing" }, { status: 400 });
    }

    const target = await prisma.buyer.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
    }

    const countryCode = normalizeCountryCode(String(buyerCountry));
    if (!countryCode) {
      return NextResponse.json(
        { error: "Invalid country code", hint: "Use ISO-2 like 'ID','US','GB'." },
        { status: 400 }
      );
    }

    const parsed = normalizeAndSplitPhone(String(buyerPhone), countryCode);
    if (!parsed) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    const updated = await prisma.buyer.update({
      where: { id },
      data: {
        buyerFullName,
        buyerAddress1,
        buyerAddress2: buyerAddress2 ?? "",
        buyerCity,
        buyerState: buyerState ?? "",
        buyerZip,
        buyerCountry: countryCode,
        buyerEmail: (buyerEmail ?? "").toLowerCase().trim(),
        buyerPhone: parsed.e164,
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
    }
    if (err?.code === "P2002") {
      return NextResponse.json(
        {
          error: "Another buyer already uses this country+phone.",
          field: ["buyerCountry", "buyerPhone"],
        },
        { status: 409 }
      );
    }
    console.error("PUT /api/buyers/[id] error:", err);
    return NextResponse.json({ error: "Failed to update buyer" }, { status: 500 });
  }
}

// DELETE /api/buyers/[id]?force=1 or ?mergeInto=<buyerId>
export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const url = new URL(request.url);
    const force = url.searchParams.get("force") === "1";
    const mergeInto = url.searchParams.get("mergeInto");

    const buyer = await prisma.buyer.findUnique({
      where: { id },
      select: { id: true, _count: { select: { orders: true, srns: true } } },
    });
    if (!buyer) {
      return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
    }

    if (mergeInto) {
      if (mergeInto === id) {
        return NextResponse.json(
          { error: "mergeInto must be a different buyer id" },
          { status: 400 }
        );
      }
      const target = await prisma.buyer.findUnique({
        where: { id: mergeInto },
        select: { id: true },
      });
      if (!target) {
        return NextResponse.json({ error: "Target buyer not found" }, { status: 404 });
      }

      await prisma.$transaction(async (tx) => {
        await tx.order.updateMany({ where: { buyerId: id }, data: { buyerId: mergeInto } });
        await tx.buyerSRN.updateMany({ where: { buyerId: id }, data: { buyerId: mergeInto } });
        await tx.buyer.delete({ where: { id } });
      });

      return NextResponse.json({ ok: true, mergedInto: mergeInto }, { status: 200 });
    }

    if (buyer._count.orders > 0 && !force) {
      return NextResponse.json(
        {
          error: "Cannot delete buyer with existing orders.",
          hint: "Use ?force=1 to hard-delete (also deletes orders), or ?mergeInto=<buyerId> to reassign.",
        },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.buyerSRN.deleteMany({ where: { buyerId: id } });
      if (force && buyer._count.orders > 0) {
        await tx.order.deleteMany({ where: { buyerId: id } });
      }
      await tx.buyer.delete({ where: { id } });
    });

    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    if (err?.code === "P2003") {
      return NextResponse.json(
        { error: "Foreign key constraint blocked deletion." },
        { status: 409 }
      );
    }
    console.error("DELETE /api/buyers/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete buyer" }, { status: 500 });
  }
}
