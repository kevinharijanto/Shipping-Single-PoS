import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

type Block = {
  additionalCharges?: Record<string, string> | null;
  shippingFee?: string | null;
  amount?: string | null;
  doubleAmount?: number | null;
  type?: string | null;
  maxWeight?: string | null;
};
type RawQuote = {
  epr?: Block | null; esr?: Block | null; err?: Block | null; ppr?: Block | null;
  currencyType?: string; currencySymbol?: string; chargeableWeight?: number; volumetricWeight?: number;
};

const BLOCK_META: Record<string, { code: "EP" | "ES" | "EX" | "PP"; key: keyof RawQuote }> = {
  epr: { code: "EP", key: "epr" },
  esr: { code: "ES", key: "esr" },
  err: { code: "EX", key: "err" },
  ppr: { code: "PP", key: "ppr" },
};

export async function POST(req: Request) {
  const base = process.env.KURASI_BASE ?? "https://api.kurasi.app";

  // Read and forward ONLY the fields Postman uses
  const inBody = await req.json().catch(() => ({}));
  const payload = {
    country: String(inBody.country ?? ""),
    actualWeight: String(inBody.actualWeight ?? ""),
    actualHeight: String(inBody.actualHeight ?? ""),
    actualLength: String(inBody.actualLength ?? ""),
    actualWidth: String(inBody.actualWidth ?? ""),
    currencyType: String(inBody.currencyType ?? ""),
    supportedCountryCode: String(inBody.supportedCountryCode ?? ""),
  };

  // Minimal headers: EXACTLY like your cURL
  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json; charset=utf-8",
  };

  try {
    const r = await fetch(`${base}/api/v1/ship/calculator`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const json = await r.json().catch(() => ({}));
    if (!r.ok || json?.status !== "SUCCESS") {
      return NextResponse.json(json ?? { status: "FAIL" }, { status: r.status });
    }

    // Normalize into {available:[]} while keeping meta for volumetric
    const data: RawQuote = json.data || {};
    const available = Object.entries(BLOCK_META)
      .map(([blockKey, meta]) => {
        const b = (data as any)[blockKey] as Block | null | undefined;
        if (!b || b.doubleAmount == null) return null;
        return {
          code: meta.code,
          key: blockKey as any,
          title: b.type ?? "",
          amount: b.doubleAmount,
          displayAmount: b.amount ?? String(b.doubleAmount),
          maxWeight: b.maxWeight ?? null,
          additionalCharges: b.additionalCharges ?? {},
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.amount - b.amount);

    return NextResponse.json(
      {
        status: "SUCCESS",
        meta: {
          currencyType: data.currencyType,
          currencySymbol: data.currencySymbol,
          chargeableWeight: data.chargeableWeight,
          volumetricWeight: data.volumetricWeight, // <- you’ll see this now
        },
        available,
        raw: data,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ status: "ERROR", errorMessage: e?.message || "Proxy failed" }, { status: 500 });
  }
}
