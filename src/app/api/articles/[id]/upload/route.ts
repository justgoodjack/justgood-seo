import { NextRequest, NextResponse } from "next/server";
import { db, must } from "@/lib/db";
import { loadSite } from "@/lib/pipeline";
import { WP } from "@/lib/wordpress";
import type { Article } from "@/lib/types";

export const maxDuration = 60;
type Ctx = { params: Promise<{ id: string }> };
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

/** Upload a photo from the user's computer (raw bytes in the body) to the WordPress media library. */
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const inBody = req.nextUrl.searchParams.get("target") === "body";
  const mime = (req.headers.get("content-type") ?? "").split(";")[0].trim();
  try {
    if (!TYPES[mime]) throw new Error("Please choose a JPG, PNG, WebP or GIF image.");
    const buf = Buffer.from(await req.arrayBuffer());
    if (buf.length === 0) throw new Error("That file was empty.");
    if (buf.length > 4_000_000) throw new Error("That image is over 4 MB. Please use a smaller one.");
    const art = must(await db().from("articles").select("*").eq("id", id).single()) as Article;
    const site = await loadSite(art.site_id);
    const base = (art.slug || art.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60) || "photo");
    const up = await new WP(site).uploadMedia(buf, `${base}-upload-${Date.now()}.${TYPES[mime]}`, mime, art.title);
    if (!inBody) must(await db().from("articles").update({ featured_img_url: up.url, featured_media_id: up.id }).eq("id", id).select("id"));
    return NextResponse.json({ ok: true, url: up.url, id: up.id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
