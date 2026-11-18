import { NextRequest, NextResponse } from "next/server";
import { db, must } from "@/lib/db";
import { attachImage, loadSite } from "@/lib/pipeline";
import type { Article } from "@/lib/types";

export const maxDuration = 120;
type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  try {
    const art = must(await db().from("articles").select("*").eq("id", id).single()) as Article;
    const site = await loadSite(art.site_id);
    const slug = art.slug || art.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60) || "image";
    const img = await attachImage(site, art.title, `${art.title}, ${site.image_style}`, slug);
    if (!img) throw new Error("No image produced. Add CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN (and/or PEXELS_API_KEY) in your environment variables and redeploy.");
    must(await db().from("articles").update({ featured_img_url: img.url, featured_media_id: img.id }).eq("id", id).select("id"));
    return NextResponse.json({ ok: true, source: img.source, url: img.url });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
