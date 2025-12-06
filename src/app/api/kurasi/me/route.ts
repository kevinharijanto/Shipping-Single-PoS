// src/app/api/kurasi/me/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
    const base = process.env.KURASI_BASE ?? "https://api.kurasi.app";
    const jar = await cookies();
    const token = jar.get("kurasi_token")?.value || "";

    if (!token) {
        return NextResponse.json({ status: "FAIL", errorMessage: "Not logged in" }, { status: 401 });
    }

    try {
        const r = await fetch(`${base}/api/v1/me`, {
            method: "GET",
            headers: {
                accept: "application/json",
                "x-ship-auth-token": token,
            },
            cache: "no-store",
        });

        const j = await r.json().catch(() => ({}));
        return NextResponse.json(j, { status: r.status });
    } catch {
        return NextResponse.json({ status: "ERROR", errorMessage: "Failed to fetch user info" }, { status: 500 });
    }
}
