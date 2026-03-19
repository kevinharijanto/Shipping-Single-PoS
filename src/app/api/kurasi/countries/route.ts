// src/app/api/kurasi/countries/route.ts
import { cookies } from "next/headers";
import { NextResponse, NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const base = process.env.KURASI_BASE ?? "https://api.kurasi.app";
  const jar = await cookies();
  const token = jar.get("kurasi_token")?.value || "";

  // Cloudflare Bypass Headers
  const userAgent = req.headers.get("user-agent") || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";
  const xForwardedFor = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";

  const fetchHeaders: Record<string, string> = {
    accept: "application/json",
    "User-Agent": userAgent,
  };
  if (token) fetchHeaders["x-ship-auth-token"] = token;
  if (xForwardedFor) fetchHeaders["X-Forwarded-For"] = xForwardedFor;

  try {
    const r = await fetch(`${base}/api/v1/ship/allCountry`, {
      method: "GET",
      headers: fetchHeaders,
      cache: "no-store",
    });

    const j = await r.json().catch(() => ({}));
    return NextResponse.json(j, { status: r.status });
  } catch {
    return NextResponse.json({ status: "ERROR", errorMessage: "Failed to load countries" }, { status: 500 });
  }
}
