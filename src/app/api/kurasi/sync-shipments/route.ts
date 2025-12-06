// src/app/api/kurasi/sync-shipments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { parsePhoneNumberFromString, getCountryCallingCode } from "libphonenumber-js";

/**
 * Build E.164 phone from Kurasi's separate fields:
 * - buyerPhone: "9176187575" (digits, may have leading 0)
 * - phoneCode: "+1" (country code with +)
 * - iso2: "US" (fallback for country code)
 */
function buildE164Phone(buyerPhone: string, phoneCode: string, iso2: string): string {
    const digits = (buyerPhone || "").trim();
    if (!digits) return "";

    // Normalize phoneCode (ensure it has +)
    let code = (phoneCode || "").trim();
    if (code && !code.startsWith("+")) code = `+${code}`;

    // If we have phoneCode from Kurasi, combine with digits
    if (code) {
        // Remove leading zeros from national number (e.g., AU: 0411... → 411...)
        const national = digits.replace(/^0+/, "");
        const candidate = `${code}${national}`;

        // Validate with libphonenumber
        const p = parsePhoneNumberFromString(candidate);
        if (p && p.isValid()) {
            return p.number; // Properly formatted E.164
        }
        // Even if not valid, store in E.164-like format
        return candidate;
    }

    // Fallback: try to derive country code from iso2
    try {
        const cc = getCountryCallingCode(iso2 as any);
        if (cc) {
            const national = digits.replace(/^0+/, "");
            const candidate = `+${cc}${national}`;
            const p = parsePhoneNumberFromString(candidate);
            if (p && p.isValid()) {
                return p.number;
            }
            return candidate;
        }
    } catch { /* ignore */ }

    // Ultimate fallback
    return digits;
}

export const dynamic = "force-dynamic";

// Parse Kurasi date string "2025/12/04 17:21:35" to Date
function parseKurasiDate(s: string | null | undefined): Date | null {
    if (!s || s === "null") return null;
    try {
        // "2025/12/04 17:21:35" -> "2025-12-04T17:21:35"
        const iso = s.replace(/\//g, "-").replace(" ", "T");
        const d = new Date(iso);
        return isNaN(d.getTime()) ? null : d;
    } catch {
        return null;
    }
}

// Parse "104,000" to 104000
function parseFee(s: string | null | undefined): number | null {
    if (!s) return null;
    const n = parseInt(s.replace(/,/g, ""), 10);
    return isNaN(n) ? null : n;
}

export async function POST(req: NextRequest) {
    const base = process.env.KURASI_BASE ?? "https://api.kurasi.app";
    const jar = await cookies();
    const token = jar.get("kurasi_token")?.value || "";

    if (!token) {
        return NextResponse.json({ status: "FAIL", errorMessage: "Not logged in" }, { status: 401 });
    }

    // Parse request body FIRST
    const body = await req.json().catch(() => ({}));
    console.log("Sync request body:", body);

    // Get clientCode from /me
    let clientCode = "";
    try {
        const meRes = await fetch(`${base}/api/v1/me`, {
            headers: { "x-ship-auth-token": token, accept: "application/json" },
            cache: "no-store",
        });
        const meData = await meRes.json();
        clientCode = meData?.data?.clientCode || "";
    } catch {
        return NextResponse.json({ status: "FAIL", errorMessage: "Failed to get user info" }, { status: 500 });
    }

    if (!clientCode) {
        return NextResponse.json({ status: "FAIL", errorMessage: "No clientCode found" }, { status: 400 });
    }

    // Calculate date range
    const today = new Date();
    const defaultStart = body.fullSync ? "2022-01-01" : new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const startDate = body.startDate || defaultStart;
    const endDate = body.endDate || today.toISOString().split("T")[0];

    console.log("Sync date range:", startDate, "to", endDate, "fullSync:", body.fullSync);

    // Clear Buyers table if requested
    if (body.clearBuyers) {
        await prisma.buyerSRN.deleteMany({});
        await prisma.buyer.deleteMany({});
    }

    // Fetch shipments from Kurasi (paginated)
    let allRows: any[] = [];
    let index = 0;
    const limit = 500; // Increased from 100 for faster sync
    let hasMore = true;
    let batchNum = 0;

    while (hasMore) {
        try {
            batchNum++;
            console.log(`[Sync] Fetching batch ${batchNum} (index: ${index}, limit: ${limit})...`);

            const r = await fetch(`${base}/api/v1/shipmentManagement`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-ship-auth-token": token,
                    accept: "application/json",
                },
                body: JSON.stringify({
                    startDate,
                    endDate,
                    clientCode,
                    sortType: "ASC",
                    flagText: "All",
                    saleRecordNumber: "",
                    kurasiShipmentId: "",
                    country: [],
                    serviceName: [],
                    saleChannel: [],
                    index,
                    limit,
                }),
                cache: "no-store",
            });

            const j = await r.json();
            const rows = j?.data || [];
            const total = j?.total || 0;
            allRows = allRows.concat(rows);

            console.log(`[Sync] Batch ${batchNum}: Got ${rows.length} records (total: ${allRows.length}/${total})`);

            if (rows.length < limit) {
                hasMore = false;
            } else {
                index += limit;
            }
        } catch (e) {
            console.error("Sync fetch error:", e);
            hasMore = false;
        }
    }

    // Upsert into database
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of allRows) {
        const kurasiShipmentId = row.kurasiShipmentId;
        if (!kurasiShipmentId) {
            skipped++;
            continue;
        }

        try {
            await prisma.kurasiShipment.upsert({
                where: { kurasiShipmentId },
                update: {
                    saleRecordNumber: String(row.saleRecordNumber || ""),
                    flagId: row.flagId || null,
                    buyerFullName: row.buyerFullName || "",
                    buyerCountry: row.buyerCountry || "",
                    buyerCity: row.buyerCity || null,
                    buyerState: row.buyerState === "null" ? null : row.buyerState,
                    buyerZip: row.buyerZip || null,
                    buyerPhone: row.buyerPhone || null,
                    serviceName: row.serviceName || null,
                    carrier: row.carrier || null,
                    shippingFee: row.shippingFee || null,
                    shippingFeeMinor: parseFee(row.shippingFee),
                    chargeableWeight: row.chargeableWeight ? parseInt(row.chargeableWeight, 10) : null,
                    actualWeight: row.actualWeight ? parseInt(row.actualWeight, 10) : null,
                    trackingNumber: row.trackingNumber || null,
                    awb: row.awb || null,
                    boxId: row.boxId || null,
                    shipmentReceivedAt: parseKurasiDate(row.shipmentReceivedDatetime),
                    labelCreatedAt: parseKurasiDate(row.labelCreatedDatetime),
                    shippedAt: parseKurasiDate(row.shippedDatetime),
                },
                create: {
                    kurasiShipmentId,
                    saleRecordNumber: String(row.saleRecordNumber || ""),
                    flagId: row.flagId || null,
                    buyerFullName: row.buyerFullName || "",
                    buyerCountry: row.buyerCountry || "",
                    buyerCity: row.buyerCity || null,
                    buyerState: row.buyerState === "null" ? null : row.buyerState,
                    buyerZip: row.buyerZip || null,
                    buyerPhone: row.buyerPhone || null,
                    serviceName: row.serviceName || null,
                    carrier: row.carrier || null,
                    shippingFee: row.shippingFee || null,
                    shippingFeeMinor: parseFee(row.shippingFee),
                    chargeableWeight: row.chargeableWeight ? parseInt(row.chargeableWeight, 10) : null,
                    actualWeight: row.actualWeight ? parseInt(row.actualWeight, 10) : null,
                    trackingNumber: row.trackingNumber || null,
                    awb: row.awb || null,
                    boxId: row.boxId || null,
                    shipmentReceivedAt: parseKurasiDate(row.shipmentReceivedDatetime),
                    labelCreatedAt: parseKurasiDate(row.labelCreatedDatetime),
                    shippedAt: parseKurasiDate(row.shippedDatetime),
                },
            });

            // Also upsert Buyer from shipment data using E.164 phone format
            const country = row.countryShortName || row.buyerCountry || "";
            const phone = buildE164Phone(row.buyerPhone || "", row.phoneCode || "", country);
            if (phone && country) {
                try {
                    await prisma.buyer.upsert({
                        where: {
                            buyerCountry_buyerPhone: { buyerCountry: country, buyerPhone: phone },
                        },
                        update: {
                            buyerFullName: row.buyerFullName || "",
                            buyerAddress1: row.buyerAddress1 || "",
                            buyerAddress2: row.buyerAddress2 || "",
                            buyerCity: row.buyerCity || "",
                            buyerState: row.buyerState === "null" ? "" : (row.buyerState || ""),
                            buyerZip: row.buyerZip || "",
                        },
                        create: {
                            buyerFullName: row.buyerFullName || "",
                            buyerAddress1: row.buyerAddress1 || "",
                            buyerAddress2: row.buyerAddress2 || "",
                            buyerCity: row.buyerCity || "",
                            buyerState: row.buyerState === "null" ? "" : (row.buyerState || ""),
                            buyerZip: row.buyerZip || "",
                            buyerCountry: country,
                            buyerPhone: phone,
                        },
                    });
                } catch (buyerErr) {
                    // Ignore buyer upsert errors, focus on shipment sync
                }
            }

            // Also update BuyerSRN if SRN exists
            const srn = parseInt(String(row.saleRecordNumber || ""), 10);
            if (!isNaN(srn) && row.trackingNumber) {
                await prisma.buyerSRN.updateMany({
                    where: { saleRecordNumber: srn },
                    data: {
                        kurasiShipmentId,
                        trackingNumber: row.trackingNumber || null,
                        trackingSlug: row.trackingList?.[0]?.slug || null,
                    },
                });
            }

            created++;
        } catch (e) {
            console.error("Upsert error for", kurasiShipmentId, e);
            skipped++;
        }
    }

    return NextResponse.json({
        status: "SUCCESS",
        synced: allRows.length,
        created,
        updated,
        skipped,
        dateRange: { startDate, endDate },
    });
}
