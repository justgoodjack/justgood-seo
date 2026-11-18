import { NextRequest, NextResponse } from "next/server";
import { cronAuthorized, unauthorized } from "@/lib/auth";
import { db, must, logJob } from "@/lib/db";
import { syncGsc } from "@/lib/gsc";
import type { Site } from "@/lib/types";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) return unauthorized();
  const sites = must(await db().from("sites").select("*").not("gsc_property", "is", null)) as Site[];
  const out: Record<string, unknown> = {};
  for (const s of sites) {
    try { out[s.name] = await syncGsc(s); }
    catch (e) { out[s.name] = { error: (e as Error).message }; await logJob("gsc", s.id, false, (e as Error).message); }
  }
  return NextResponse.json(out);
}
