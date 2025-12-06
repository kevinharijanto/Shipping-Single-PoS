// src/app/api/kurasi/countries/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const base = process.env.KURASI_BASE ?? "https://api.kurasi.app";
  const jar = await cookies();
  const token = jar.get("kurasi_token")?.value || "";

  try {
    const r = await fetch(`${base}/api/v1/ship/allCountry`, {
      method: "GET",
      headers: {
        accept: "application/json",
        ...(token ? { "x-ship-auth-token": token } : {}),
      },
      cache: "no-store",
    });

    const j = await r.json().catch(() => ({}));
    return NextResponse.json(j, { status: r.status });
  } catch {
    return NextResponse.json({ status: "ERROR", errorMessage: "Failed to load countries" }, { status: 500 });
  }
}
