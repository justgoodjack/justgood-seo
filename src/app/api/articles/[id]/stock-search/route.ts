import { NextRequest, NextResponse } from "next/server";
import { db, must } from "@/lib/db";
import { loadSite, stockQueries } from "@/lib/pipeline";
import { searchStock } from "@/lib/media";
import type { Article } from "@/lib/types";

export const maxDuration = 60;
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const art = must(await db().from("articles").select("*").eq("id", id).single()) as Article;
    const site = await loadSite(art.site_id);
    let queries: string[] = Array.isArray(body.queries) ? body.queries : [];
    if (typeof body.query === "string" && body.query.trim()) queries = [body.query.trim()];
    if (!queries.length) {
      const context = art.html_body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      queries = [...(await stockQueries(site, art.title, context)), site.niche].filter(Boolean);
    }
    const candidates = await searchStock(queries, Number(body.page) || 1, Array.isArray(body.exclude) ? body.exclude : []);
    if (!candidates.length && !process.env.PEXELS_API_KEY && !process.env.PIXABAY_API_KEY) throw new Error("No stock key set. Add PIXABAY_API_KEY or PEXELS_API_KEY in your environment variables.");
    return NextResponse.json({ queries, candidates });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
