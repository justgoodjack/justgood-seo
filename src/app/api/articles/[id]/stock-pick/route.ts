import { NextRequest, NextResponse } from "next/server";
import { db, must } from "@/lib/db";
import { loadSite } from "@/lib/pipeline";
import { downloadStock } from "@/lib/media";
import { WP } from "@/lib/wordpress";
import type { Article } from "@/lib/types";

export const maxDuration = 60;
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const { full, credit } = await req.json();
  try {
    const art = must(await db().from("articles").select("*").eq("id", id).single()) as Article;
    const site = await loadSite(art.site_id);
    const bytes = await downloadStock(String(full));
    const slug = art.slug || art.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60) || "image";
    const up = await new WP(site).uploadMedia(bytes, `${slug}.jpg`, "image/jpeg", `${art.title} (${String(credit ?? "")})`);
    must(await db().from("articles").update({ featured_img_url: up.url, featured_media_id: up.id }).eq("id", id).select("id"));
    return NextResponse.json({ ok: true, url: up.url });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
