import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/* ------------------------ helpers ------------------------ */

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

const SERVICE_CODES = new Set(["EP", "ES", "EX", "PP"]); // Kurasi codes
const VALUE_CURRENCIES = new Set(["USD", "GBP", "AUD", "EUR", "IDR", "SGD"]);

/**
 * Convert a UI "totalValue" input into a Prisma Decimal-compatible string.
 * Accepts "120000" or "1,200.00".
 */
function normalizeMoneyToDecimalString(raw: string): string {
  const s = String(raw ?? "").replace(/,/g, "").trim();
  if (s === "") return "0";
  // allow integer or decimal
  if (!/^\d+(\.\d+)?$/.test(s)) throw new Error("Invalid total value");
  return s; // Prisma Decimal accepts numeric string
}

/* =========================================================
 * GET /api/orders
 *   ?page=1&limit=10
 *   ?groupBy=customer  -> returns { groups: [{ customer, orders }] }
 *   Optional filters:
 *     status=local:in_progress | local:paid | delivery:label_confirmed | ...
 * ========================================================= */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10)));
    const status = url.searchParams.get("status") || "";
    const groupBy = url.searchParams.get("groupBy") || "";

    // Optional status filter
    let where: any = {};
    if (status) {
      const [scope, value] = status.split(":");
      if (scope === "local") where.localStatus = value;
      else if (scope === "delivery") where.deliveryStatus = value;
    }

    // Grouped by customer + date (composite key)
    if (groupBy === "customer") {
      const customers = await prisma.customer.findMany({
        where: { orders: { some: where } },
        orderBy: { name: "asc" },
        include: {
          orders: {
            where,
            orderBy: { placedAt: "desc" },
            select: {
              id: true,
              placedAt: true,
              localStatus: true,
              deliveryStatus: true,
              shippingPriceMinor: true,
              notes: true,
              srnId: true,
              krsTrackingNumber: true,
              buyer: { select: { id: true, buyerFullName: true, buyerCountry: true } },
              package: { select: { id: true, weightGrams: true, service: true } },
            },
          },
        },
      });

      // Create groups by (customer, date) composite key
      const groupsMap = new Map<string, {
        customer: { id: string; name: string; phone: string };
        date: string;
        orders: typeof customers[0]["orders"];
      }>();

      for (const c of customers) {
        for (const order of c.orders) {
          // Extract date only (YYYY-MM-DD), handle null placedAt
          let dateStr: string;
          if (order.placedAt) {
            const d = new Date(order.placedAt);
            dateStr = isNaN(d.getTime()) ? "unknown" : d.toISOString().split("T")[0];
          } else {
            dateStr = "unknown";
          }
          const key = `${c.id}|${dateStr}`;

          if (!groupsMap.has(key)) {
            groupsMap.set(key, {
              customer: { id: c.id, name: c.name, phone: c.phone },
              date: dateStr,
              orders: [],
            });
          }
          groupsMap.get(key)!.orders.push(order);
        }
      }

      // Sort orders within each group by SRN descending (newest first)
      for (const g of groupsMap.values()) {
        g.orders.sort((a, b) => (b.srnId ?? 0) - (a.srnId ?? 0));
      }

      // Sort groups by max SRN (first order after sorting) descending
      const groups = Array.from(groupsMap.values()).sort((a, b) => {
        const maxSrnA = a.orders[0]?.srnId ?? 0;
        const maxSrnB = b.orders[0]?.srnId ?? 0;
        return maxSrnB - maxSrnA;
      });

      return NextResponse.json({ groups });
    }

    // Default: flat list with pagination
    const [total, orders] = await prisma.$transaction([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { placedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          buyer: { select: { id: true, buyerFullName: true, buyerCountry: true } },
          package: {
            select: {
              id: true,
              weightGrams: true,
              service: true,
              totalValue: true,
              currency: true,
              packageDescription: true,
              hsCode: true,
            },
          },
          srn: { select: { saleRecordNumber: true, kurasiShipmentId: true, trackingNumber: true } },
        },
      }),
    ]);

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (e: any) {
    console.error("GET /api/orders error:", e);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      customerId,
      buyerId,
      service,
      weightGrams,
      totalValue,
      currency,
      package: pkg,
      srn,
      externalRef,
      saleChannel,
      taxReference,
      taxNumber,
      placedAt,
      shippingPriceMinor,        // <-- read
      pricingSource,             // <-- read
      notes,
      localStatus = "in_progress",
      deliveryStatus = "not_yet_submit_to_kurasi",
      paymentMethod = "qris",
    } = body ?? {};

    // (… all your existing validation stays the same …)

    // Normalize totalValue -> Decimal string
    let totalValueStr: string;
    try { totalValueStr = normalizeMoneyToDecimalString(totalValue); }
    catch { return bad("Invalid total value"); }

    // Coerce delivery fee (minor units)
    const feeMinor =
      shippingPriceMinor === null || shippingPriceMinor === undefined
        ? null
        : (() => {
          const n = Number(shippingPriceMinor);
          if (!Number.isFinite(n) || n < 0) return null;
          return Math.round(n);
        })();

    const created = await prisma.$transaction(async (tx) => {
      const srnInt = Number(srn);

      // Ensure SRN
      const srnRec = await tx.buyerSRN.upsert({
        where: { saleRecordNumber: srnInt },
        update: { buyerId },
        create: { saleRecordNumber: srnInt, buyerId },
      });

      // Package detail
      const pkgRec = await tx.packageDetail.create({
        data: {
          weightGrams: Number(weightGrams),
          totalValue: totalValueStr,
          currency: String(currency),
          packageDescription: String(pkg.packageDescription),
          hsCode: (pkg.hsCode ?? "").trim() || null,
          service: String(service),
        },
      });

      // Order
      const order = await tx.order.create({
        data: {
          placedAt: placedAt ? new Date(placedAt) : new Date(),
          notes: notes ? String(notes) : null,

          customerId,
          buyerId,
          packageId: pkgRec.id,

          localStatus,
          deliveryStatus,
          paymentMethod,

          srnId: srnRec.saleRecordNumber,
          externalRef: externalRef ? String(externalRef) : null,

          saleChannel: saleChannel ?? null,
          taxReference: taxReference ?? null,
          taxNumber: taxReference ? (String(taxNumber || "").trim() || null) : null,

          // ✅ persist delivery fee + source
          shippingPriceMinor: feeMinor,
          pricingSource: feeMinor != null ? (pricingSource || "kurasi") : null,
        },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          buyer: { select: { id: true, buyerFullName: true, buyerCountry: true } },
          package: true,
          srn: true,
        },
      });

      return order;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002" && Array.isArray(e?.meta?.target) && e.meta.target.includes("srnId")) {
      return bad("This SRN is already linked to another order", 409);
    }
    console.error("POST /api/orders error:", e);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
