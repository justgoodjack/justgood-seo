import { NextRequest, NextResponse } from "next/server";
import { COOKIE, sessionToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;
  // Cron routes authenticate with CRON_SECRET inside the handler; login is public.
  if (p.startsWith("/api/cron") || p === "/login" || p === "/api/login") return NextResponse.next();

  const ok = req.cookies.get(COOKIE)?.value === (await sessionToken());
  if (ok) return NextResponse.next();
  if (p.startsWith("/api/")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
