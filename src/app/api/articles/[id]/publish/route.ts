import { NextRequest, NextResponse } from "next/server";
import { db, must } from "@/lib/db";
import { publishArticle, loadSite } from "@/lib/pipeline";
import type { Article } from "@/lib/types";

export const maxDuration = 120;
type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  try {
    const art = must(await db().from("articles").select("*").eq("id", id).single()) as Article;
    if (art.status === "queued") throw new Error("Draft not generated yet");
    const res = await publishArticle(await loadSite(art.site_id), art);
    return NextResponse.json({ ok: true, link: res.link });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
