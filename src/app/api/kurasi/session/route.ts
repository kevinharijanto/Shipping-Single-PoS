import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const verify = url.searchParams.get("verify") === "1";

  const jar = await cookies();
  const token = jar.get("kurasi_token")?.value || "";
  const label = jar.get("kurasi_label")?.value || null;

  let loggedIn = !!token;

  if (verify && token) {
    // optional lightweight verification ping: fetch something that requires auth
    try {
      const userAgent = req.headers.get("user-agent") || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";
      const xForwardedFor = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";

      const fetchHeaders: Record<string, string> = {
        "x-ship-auth-token": token,
        "User-Agent": userAgent,
      };
      
      if (xForwardedFor) {
        fetchHeaders["X-Forwarded-For"] = xForwardedFor;
      }

      const r = await fetch(
        (process.env.KURASI_BASE ?? "https://api.kurasi.app") + "/api/v1/ship/country",
        { headers: fetchHeaders, cache: "no-store" }
      );
      loggedIn = r.ok;
    } catch {
      loggedIn = false;
    }
  }

  const tokenPreview = token
    ? `${token.slice(0, 6)}…${token.slice(-4)}`
    : null;

  return NextResponse.json({
    status: "SUCCESS",
    loggedIn,
    label,
    tokenPreview,
    tokenLength: token ? token.length : 0,
  });
}
