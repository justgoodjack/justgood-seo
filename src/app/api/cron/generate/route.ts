import { NextRequest, NextResponse } from "next/server";
import { cronAuthorized, unauthorized } from "@/lib/auth";
import { runGeneration } from "@/lib/pipeline";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) return unauthorized();
  return NextResponse.json({ results: await runGeneration({ budgetMs: 200_000, maxItems: 6 }) });
}
