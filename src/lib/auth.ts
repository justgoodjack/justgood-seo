import { NextRequest, NextResponse } from "next/server";
import { env } from "./config";

export const COOKIE = "seo_session";

/** Token = SHA-256(password + ":" + salt). Works in both Edge middleware and Node. */
export async function sessionToken(): Promise<string> {
  const data = new TextEncoder().encode(`${env("DASHBOARD_PASSWORD")}:${env("ENCRYPTION_KEY")}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function cronAuthorized(req: NextRequest): boolean {
  const secret = env("CRON_SECRET", false);
  return !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
}

export const unauthorized = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });
