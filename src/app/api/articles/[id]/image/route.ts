import { NextRequest, NextResponse } from "next/server";
import { db, must } from "@/lib/db";
import { attachImage, loadSite, visualPrompt } from "@/lib/pipeline";
import type { Article } from "@/lib/types";

export const maxDuration = 120;
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const mode = body.mode === "ai" || body.mode === "stock" ? body.mode : "auto";
  const inBody = !!body.target && body.target !== "featured"; // anything but the featured photo is a preview or body photo: do not touch the article
  try {
    const art = must(await db().from("articles").select("*").eq("id", id).single()) as Article;
    const site = await loadSite(art.site_id);
    const seen = ((art as unknown as { stock_seen?: string[] }).stock_seen ?? []).slice(-60);
    const slug0 = art.slug || art.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60) || "image";
    const slug = inBody ? `${slug0}-${Date.now()}` : slug0;
    const img = await attachImage(site, art.title, mode === "stock" ? "" : typeof body.prompt === "string" && body.prompt.trim() ? body.prompt.trim() : await visualPrompt(site, art.title), slug, typeof body.query === "string" && body.query.trim() ? body.query.trim() : art.title, mode, seen, art.html_body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    if (!img) throw new Error(mode === "ai" ? "No AI image produced. Check CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in your environment variables (or the daily free allowance is used up)." : mode === "stock" ? "No stock photo found. Check PIXABAY_API_KEY or PEXELS_API_KEY in your environment variables, or try again." : "No image produced. Add Cloudflare and/or Pixabay keys in your environment variables.");
    must(await db().from("articles").update({ featured_img_url: img.url, featured_media_id: img.id }).eq("id", id).select("id"));
    if (img.stockId) await db().from("articles").update({ stock_seen: [...seen, img.stockId] }).eq("id", id); // needs migration 0002; harmless if absent
    return NextResponse.json({ ok: true, source: img.source, url: img.url });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
