import { NextRequest, NextResponse } from "next/server";
import { COOKIE, sessionToken } from "@/lib/auth";
import { env } from "@/lib/config";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const ok = form.get("password") === env("DASHBOARD_PASSWORD");
  const res = NextResponse.redirect(new URL(ok ? "/" : "/login?error=1", req.url), 303);
  if (ok) res.cookies.set(COOKIE, await sessionToken(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}
