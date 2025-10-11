import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ status: "SUCCESS" }, { status: 200 });
  res.cookies.set({
    name: "kurasi_token",
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0, // delete
  });
  return res;
}
