import { NextRequest, NextResponse } from "next/server";
import { cronAuthorized, unauthorized } from "@/lib/auth";
import { db, must, logJob } from "@/lib/db";
import { findOutreach, runGeoChecks } from "@/lib/geo";
import { syncExistingPosts } from "@/lib/linker";
import type { Site } from "@/lib/types";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) return unauthorized();
  const sites = must(await db().from("sites").select("*")) as Site[];
  const out: Record<string, unknown> = {};
  for (const s of sites) {
    try {
      out[s.name] = {
        geo: await runGeoChecks(s, 4),
        outreach: await findOutreach(s, 3),
        links: await syncExistingPosts(s, 15), // keeps the link index in step with the live site
      };
    } catch (e) {
      out[s.name] = { error: (e as Error).message };
      await logJob("geo", s.id, false, (e as Error).message);
    }
  }
  return NextResponse.json(out);
}
