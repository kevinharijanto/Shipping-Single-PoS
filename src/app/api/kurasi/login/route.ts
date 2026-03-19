import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type LoginBody = { username: string; password: string };
type LoginResponse = {
  status: "SUCCESS" | "FAIL" | "ERROR";
  data?: { token?: string };
  errorMessage?: string;
};

export async function POST(req: Request) {
  const base = process.env.KURASI_BASE ?? "https://api.kurasi.app";
  const body = (await req.json().catch(() => ({}))) as Partial<LoginBody>;

  if (!body.username || !body.password) {
    return NextResponse.json(
      { status: "FAIL", errorMessage: "username and password are required" },
      { status: 400 }
    );
  }

  try {
    const userAgent = req.headers.get("user-agent") || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";
    const xForwardedFor = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";

    const fetchHeaders: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json; charset=utf-8",
      "User-Agent": userAgent,
    };
    
    if (xForwardedFor) {
      fetchHeaders["X-Forwarded-For"] = xForwardedFor;
    }

    const r = await fetch(`${base}/api/v1/login`, {
      method: "POST",
      headers: fetchHeaders,
      body: JSON.stringify({ username: body.username, password: body.password }),
      cache: "no-store",
    });

    const json = (await r.json().catch(() => ({}))) as LoginResponse;

    if (!r.ok || json?.status !== "SUCCESS" || !json?.data?.token) {
      return NextResponse.json(json ?? { status: "FAIL" }, { status: r.status });
    }

    const token = json.data.token!;
    const res = NextResponse.json({ status: "SUCCESS" }, { status: 200 });

    // Check if behind HTTPS (direct or via proxy like Cloudflare)
    const forwardedProto = req.headers.get("x-forwarded-proto");
    const secure = forwardedProto === "https" || (process.env.NODE_ENV === "production" && forwardedProto !== "http");

    // HttpOnly session token (used by server-to-server proxies)
    res.cookies.set({
      name: "kurasi_token",
      value: token,
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    // Display label (non-HttpOnly, only for UI)
    res.cookies.set({
      name: "kurasi_label",
      value: String(body.username || ""),
      httpOnly: false,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch (e: any) {
    return NextResponse.json(
      { status: "ERROR", errorMessage: e?.message || "Login proxy failed" },
      { status: 500 }
    );
  }
}
