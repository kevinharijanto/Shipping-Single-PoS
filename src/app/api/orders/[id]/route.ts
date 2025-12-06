import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

/* ---------------- helpers ---------------- */

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function toDecimal(n: any) {
  if (n === undefined) return undefined;
  if (n === null || n === "") return null;
  const num = Number(n);
  return Number.isFinite(num) ? num : null;
}

function mapKurasiService(k?: string | null) {
  const code = (k || "").toUpperCase();
  switch (code) {
    case "EX": return "express";
    case "ES": return "economy_standard";
    case "EP": return "economy_plus";
    case "PP": return "packet_premium";
    default:   return "economy";
  }
}

/* ========================  GET /api/orders/[id]  ======================== */

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        buyer: true,
        package: true,
      },
    });

    if (!order) return bad("Order not found", 404);

    // Attach SRN number as srn for convenience (if schema has srnId)
    const srn =
      order.srnId != null
        ? await prisma.buyerSRN.findUnique({
            where: { saleRecordNumber: order.srnId },
            select: { saleRecordNumber: true },
          })
        : null;

    return NextResponse.json({
      ...order,
      srn: srn?.saleRecordNumber ?? null,
    });
  } catch (e) {
    console.error("GET /orders/[id] error:", e);
    return bad("Failed to fetch order", 500);
  }
}

/* ========================  PUT /api/orders/[id]  ======================== */

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const body = await request.json().catch(() => ({}));

    const {
      // order-level
      notes,
      localStatus,
      deliveryStatus,
      paymentMethod,
      externalRef,
      labelId,
      trackingLink,
      currency,

      // optional SRN change
      srn, // number|string

      // package edits
      weightGrams,
      lengthCm,
      widthCm,
      heightCm,
      service, // EP/ES/EX/PP (Kurasi code) or direct enum
      sku,
      hsCode,
      countryOfOrigin,
      packageDescription,
      totalValue, // number/decimal (optional)
    } = body ?? {};

    // Ensure order exists + load buyer/package ids we need for updates
    const existing = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        buyerId: true,
        packageId: true,
        srnId: true,
        krsTrackingNumber: true,
      },
    });
    if (!existing) return bad("Order not found", 404);

    // --- SRN update (optional) ---
    let newSrnId: number | undefined;
    if (srn !== undefined && srn !== null && `${srn}`.trim() !== "") {
      const srnInt = Number(srn);
      if (!Number.isInteger(srnInt) || srnInt <= 0) {
        return bad("SRN must be a positive integer");
      }

      // If already same, skip checks
      if (existing.srnId !== srnInt) {
        // Is this SRN currently used by another order for a *different* buyer?
        const inUse = await prisma.order.findFirst({
          where: { srnId: srnInt },
          select: { id: true, buyerId: true },
        });
        if (inUse && inUse.buyerId !== existing.buyerId) {
          return bad(
            "This SRN is already linked to another recipient's order",
            409
          );
        }

        // Upsert the SRN row and (re)assign to this order's buyer
        await prisma.buyerSRN.upsert({
          where: { saleRecordNumber: srnInt },
          update: { buyerId: existing.buyerId },
          create: { saleRecordNumber: srnInt, buyerId: existing.buyerId },
        });

        newSrnId = srnInt;
      }
    } else if (srn === null) {
      // Explicitly clear SRN
      newSrnId = null as unknown as number; // handled below with conditional spread
    }

    // --- build package update (only if any provided) ---
    const willUpdatePkg =
      weightGrams !== undefined ||
      lengthCm !== undefined ||
      widthCm !== undefined ||
      heightCm !== undefined ||
      service !== undefined ||
      currency !== undefined ||
      sku !== undefined ||
      hsCode !== undefined ||
      countryOfOrigin !== undefined ||
      packageDescription !== undefined ||
      totalValue !== undefined;

    if (willUpdatePkg) {
      await prisma.packageDetail.update({
        where: { id: existing.packageId },
        data: {
          ...(weightGrams !== undefined && { weightGrams: toDecimal(weightGrams) as any }),
          ...(lengthCm !== undefined && { lengthCm: toDecimal(lengthCm) as any }),
          ...(widthCm !== undefined && { widthCm: toDecimal(widthCm) as any }),
          ...(heightCm !== undefined && { heightCm: toDecimal(heightCm) as any }),
          ...(service !== undefined && {
            service: ["economy","economy_standard","express","economy_plus","packet_premium"]
              .includes(String(service))
              ? String(service)
              : mapKurasiService(service),
          }),
          ...(currency !== undefined && { currency: currency || null }),
          ...(sku !== undefined && { sku: sku || null }),
          ...(hsCode !== undefined && { hsCode: hsCode || null }),
          ...(countryOfOrigin !== undefined && { countryOfOrigin: countryOfOrigin || null }),
          ...(packageDescription !== undefined && { packageDescription: packageDescription || null }),
          ...(totalValue !== undefined && { totalValue: toDecimal(totalValue) as any }),
        },
      });
    }

    // --- order update ---
    const updated = await prisma.order.update({
      where: { id },
      data: {
        ...(notes !== undefined && { notes }),
        ...(localStatus && { localStatus }),
        ...(deliveryStatus && { deliveryStatus }),
        ...(paymentMethod && { paymentMethod }),
        ...(externalRef !== undefined && { externalRef }),
        ...(labelId !== undefined && { labelId }),
        ...(trackingLink !== undefined && { trackingLink }),
        ...(currency !== undefined && { currency: currency || null }),
        ...(newSrnId !== undefined && { srnId: newSrnId as any }),
      },
      include: {
        customer: true,
        buyer: true,
        package: true,
      },
    });

    // If the order has a KRS tracking number and package details were updated, sync with Kurasi
    if (existing.krsTrackingNumber && willUpdatePkg) {
      try {
        // Get auth token from cookies
        const cookieStore = await cookies();
        const authToken = cookieStore.get("kurasi_token")?.value || "";
        
        if (authToken) {
          // Call the update shipment API
          const updateResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/kurasi/update-shipment`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ orderId: id }),
          });
          
          if (!updateResponse.ok) {
            console.error("Failed to sync shipment with Kurasi:", await updateResponse.text());
            // Don't fail the order update, just log the error
          } else {
            console.log("Successfully synced shipment with Kurasi");
          }
        } else {
          console.log("No Kurasi auth token found, skipping shipment sync");
        }
      } catch (error) {
        console.error("Error syncing shipment with Kurasi:", error);
        // Don't fail the order update, just log the error
      }
    }

    return NextResponse.json(updated);
  } catch (e) {
    console.error("PUT /orders/[id] error:", e);
    return bad("Failed to update order", 500);
  }
}

/* ========================  DELETE /api/orders/[id]  ======================== */

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;

    // fetch to know srnId & packageId before deletion
    const existing = await prisma.order.findUnique({
      where: { id },
      select: { srnId: true, packageId: true },
    });
    if (!existing) return bad("Order not found", 404);

    await prisma.$transaction(async (tx) => {
      await tx.order.delete({ where: { id } });

      // Optionally delete the package row (if you want to keep orphan packages, remove this)
      if (existing.packageId) {
        await tx.packageDetail.delete({ where: { id: existing.packageId } }).catch(() => {});
      }

      // If the SRN is now unused by any order, remove the BuyerSRN row so the number is cleanly reusable
      if (existing.srnId != null) {
        const stillUsed = await tx.order.count({ where: { srnId: existing.srnId } });
        if (stillUsed === 0) {
          await tx.buyerSRN.delete({ where: { saleRecordNumber: existing.srnId } }).catch(() => {});
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /orders/[id] error:", e);
    return bad("Failed to delete order", 500);
  }
}
