import { NextResponse } from "next/server";
import { calculateFee } from "@/lib/feeCalculator";
import { countryMap } from "@/lib/countryMapping";

export const dynamic = "force-dynamic";

/**
 * Public API endpoint for getting combined shipping quotes.
 * Combines Kurasi shipping fees with local handling fees.
 * 
 * POST /api/shipping-quote
 * Body: {
 *   country: string,       // Destination country name (e.g., "United States")
 *   countryCode?: string,  // Optional: ISO-2 country code (e.g., "US") - will be derived from country if not provided
 *   actualWeight: number,  // Weight in grams
 *   actualLength?: number, // Length in cm (default: 0)
 *   actualWidth?: number,  // Width in cm (default: 0)
 *   actualHeight?: number, // Height in cm (default: 0)
 * }
 * 
 * Response: {
 *   status: "SUCCESS" | "FAIL" | "ERROR",
 *   meta: { currency, chargeableWeight, volumetricWeight },
 *   services: [{
 *     code: "EX" | "EP" | "ES" | "PP",
 *     title: string,
 *     kurasiShippingFee: number,
 *     localHandlingFee: number,
 *     totalFee: number,
 *     maxWeight: string | null,
 *   }],
 *   errorMessage?: string,
 * }
 */

type ServiceQuote = {
    code: "EX" | "EP" | "ES" | "PP";
    title: string;
    totalFee: number;
    maxWeight: string | null;
};

type Block = {
    additionalCharges?: Record<string, string> | null;
    shippingFee?: string | null;
    amount?: string | null;
    doubleAmount?: number | null;
    type?: string | null;
    maxWeight?: string | null;
};

type RawQuote = {
    epr?: Block | null;
    esr?: Block | null;
    err?: Block | null;
    ppr?: Block | null;
    currencyType?: string;
    currencySymbol?: string;
    chargeableWeight?: number;
    volumetricWeight?: number;
};

const BLOCK_META: Record<string, { code: "EP" | "ES" | "EX" | "PP"; title: string }> = {
    esr: { code: "ES", title: "Economy Standard" },
    epr: { code: "EP", title: "Economy Plus" },
    err: { code: "EX", title: "Express" },
    ppr: { code: "PP", title: "Packet Premium" },
};

// Reverse lookup: country name -> ISO code
function getCountryCode(countryName: string): string | null {
    const entry = Object.entries(countryMap).find(
        ([, name]) => name.toLowerCase() === countryName.toLowerCase()
    );
    return entry ? entry[0] : null;
}

export async function POST(req: Request) {
    const base = process.env.KURASI_BASE ?? "https://api.kurasi.app";

    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { status: "ERROR", errorMessage: "Invalid JSON body" },
            { status: 400 }
        );
    }

    // Validate required fields
    const { country, countryCode: providedCountryCode, actualWeight } = body;

    if (!country || typeof country !== "string") {
        return NextResponse.json(
            { status: "ERROR", errorMessage: "Missing required field: country" },
            { status: 400 }
        );
    }

    if (!actualWeight || typeof actualWeight !== "number" || actualWeight <= 0) {
        return NextResponse.json(
            { status: "ERROR", errorMessage: "Missing or invalid field: actualWeight (must be positive number in grams)" },
            { status: 400 }
        );
    }

    // Determine country code for fee calculation
    const countryCode = providedCountryCode || getCountryCode(country);
    if (!countryCode) {
        return NextResponse.json(
            { status: "ERROR", errorMessage: `Could not determine country code for "${country}". Please provide countryCode field.` },
            { status: 400 }
        );
    }

    // Prepare Kurasi API payload
    const kurasiPayload = {
        country: String(country),
        actualWeight: String(actualWeight),
        actualHeight: String(body.actualHeight ?? 0),
        actualLength: String(body.actualLength ?? 0),
        actualWidth: String(body.actualWidth ?? 0),
        currencyType: "IDR",
        supportedCountryCode: "ID",
    };

    try {
        const response = await fetch(`${base}/api/v1/ship/calculator`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json; charset=utf-8",
            },
            body: JSON.stringify(kurasiPayload),
            cache: "no-store",
        });

        const json = await response.json().catch(() => ({}));

        if (!response.ok || json?.status !== "SUCCESS") {
            return NextResponse.json(
                {
                    status: "FAIL",
                    errorMessage: json?.message || json?.errorMessage || `Kurasi API returned status: ${json?.status || response.status}`
                },
                { status: response.ok ? 400 : response.status }
            );
        }

        const data: RawQuote = json.data || {};

        // Calculate local handling fee
        const localHandlingFee = calculateFee(actualWeight, countryCode);

        // Build combined quote for each available service
        const services: ServiceQuote[] = Object.entries(BLOCK_META)
            .map(([blockKey, meta]) => {
                const block = (data as any)[blockKey] as Block | null | undefined;
                if (!block || block.doubleAmount == null) return null;

                const kurasiShippingFee = block.doubleAmount;

                return {
                    code: meta.code,
                    title: meta.title,
                    totalFee: kurasiShippingFee + localHandlingFee,
                    maxWeight: block.maxWeight ?? null,
                };
            })
            .filter((s): s is ServiceQuote => s !== null)
            .sort((a, b) => a.totalFee - b.totalFee);

        if (services.length === 0) {
            return NextResponse.json(
                {
                    status: "FAIL",
                    errorMessage: "No shipping services available for this destination/weight combination",
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                status: "SUCCESS",
                meta: {
                    currency: "IDR",
                    chargeableWeight: data.chargeableWeight,
                    volumetricWeight: data.volumetricWeight,
                },
                services,
            },
            { status: 200 }
        );
    } catch (error: any) {
        return NextResponse.json(
            { status: "ERROR", errorMessage: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
