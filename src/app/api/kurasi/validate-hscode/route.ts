import { NextRequest, NextResponse } from 'next/server';
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hsCode = (searchParams.get("hsCode") || "").trim();

    if (!hsCode) {
      return NextResponse.json({ error: "HS Code is required" }, { status: 400 });
    }

    // Pull the session token from the HttpOnly cookie
    const jar = await cookies();
    const token = jar.get("kurasi_token")?.value || "";

    // Call Kurasi with the session token
    const r = await fetch(
      `https://api.kurasi.app/api/v1/validate/hsCode/${encodeURIComponent(hsCode)}`,
      {
        method: "GET",
        headers: {
          accept: "application/json, text/plain, */*",
          origin: "https://kurasi.app",
          referer: "https://kurasi.app/",
          "x-ship-auth-token": token,           // ← from cookie
        },
        cache: "no-store",
      }
    );

    const data = await r.json().catch(() => ({} as any));

    if (!r.ok || data?.status === "FAIL") {
      // Map Kurasi return codes to your UI messages
      const msg =
        data?.returnCode === "007"
          ? "HSCode must be 6 or 10 digits."
          : data?.returnCode === "008"
          ? "Incorrect HSCode"
          : data?.returnMessage || "HS Code validation failed";
      return NextResponse.json(
        { error: msg, returnCode: data?.returnCode, returnMessage: data?.returnMessage },
        { status: 400 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("HS validate error:", err);
    return NextResponse.json({ error: "Failed to validate HS Code" }, { status: 500 });
  }
}