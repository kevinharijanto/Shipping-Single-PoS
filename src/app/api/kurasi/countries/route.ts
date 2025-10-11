import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const base = process.env.KURASI_BASE ?? "https://api.kurasi.app";
  const cookieStore = cookies();
  const token = cookieStore.get("kurasi_token")?.value || process.env.KURASI_TOKEN;

  if (!token) {
    return NextResponse.json(
      { status: "FAIL", errorMessage: "Not authenticated. Please login first." },
      { status: 401 }
    );
  }

  try {
    const r = await fetch(`${base}/api/v1/ship/allCountry`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Origin: "https://kurasi.app",
        "X-Requested-With": "XMLHttpRequest",
        "X-Ship-Auth-Token": token,
      },
      cache: "no-store",
    });

    const json = await r.json().catch(() => ({}));
    if (!r.ok || json?.status !== "SUCCESS") {
      return NextResponse.json(json ?? { status: "FAIL" }, { status: r.status });
    }

    // Sliding refresh: extend cookie life on successful use
    const res = NextResponse.json(json, { status: 200 });
    res.cookies.set({
      name: "kurasi_token",
      value: token,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // refresh 30 days
    });
    return res;
  } catch (e: any) {
    return NextResponse.json(
      { status: "ERROR", errorMessage: e?.message || "Countries proxy failed" },
      { status: 500 }
    );
  }
}
