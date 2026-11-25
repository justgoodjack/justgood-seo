import { NextRequest, NextResponse } from "next/server";
import { db, must } from "@/lib/db";
import { WP } from "@/lib/wordpress";
import { buildCalendar, mineKeywords, rebalanceCalendar } from "@/lib/keywords";
import { syncExistingPosts } from "@/lib/linker";
import { deleteArticle, runGeneration, runPublishing } from "@/lib/pipeline";
import { syncGsc } from "@/lib/gsc";
import { findOutreach, runGeoChecks, seedGeoPrompts } from "@/lib/geo";
import { encrypt } from "@/lib/crypto";
import type { Site } from "@/lib/types";

export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string; action: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id, action } = await params;
  const site = must(await db().from("sites").select("*").eq("id", id).single()) as Site;
  const body = await req.json().catch(() => ({}));
  try {
    switch (action) {
      case "test-wp": {
        const wp = new WP(site);
        const me = await wp.whoami();
        const cats = await wp.categories();
        return NextResponse.json({ ok: true, user: me.name, canPublish: me.canPublish, canUnfilteredHtml: me.canUnfiltered, categories: cats });
      }
      case "test-post": return NextResponse.json({ ok: true, ...(await new WP(site).testDraft()) });
      case "sync-posts": return NextResponse.json(await syncExistingPosts(site, 40));
      case "mine-keywords": return NextResponse.json(await mineKeywords(site, body.seeds));
      case "rebalance-calendar": return NextResponse.json(await rebalanceCalendar(site));
      case "build-calendar": return NextResponse.json(await buildCalendar(site, { days: 30, cadence: body.cadence, today: body.today }));
      case "generate": return NextResponse.json({ results: await runGeneration({ siteId: id, budgetMs: 240_000, maxItems: body.count ?? 3 }) });
      case "publish-due": return NextResponse.json({ results: await runPublishing({ siteId: id }) });
      case "gsc-sync": return NextResponse.json(await syncGsc(site));
      case "seed-geo": return NextResponse.json({ prompts: await seedGeoPrompts(site) });
      case "geo-run": return NextResponse.json(await runGeoChecks(site, 5));
      case "outreach": return NextResponse.json(await findOutreach(site, 3));
      case "update": {
        const patch: Record<string, unknown> = {};
        for (const k of ["wp_url", "wp_user", "name", "niche", "voice_prompt", "image_style", "publish_mode", "cadence_per_month", "gsc_property", "seo_plugin", "default_category_id", "seed_topics", "example_urls"]) {
          if (k in body) patch[k] = body[k];
        }
        if (body.wp_app_pass) patch.wp_app_pass_enc = encrypt(body.wp_app_pass);
        must(await db().from("sites").update(patch).eq("id", id).select("id"));
        return NextResponse.json({ ok: true });
      }
      case "delete-topics": {
        let q = db().from("keywords").delete().eq("site_id", id);
        if (body.scope === "unscheduled") q = q.eq("status", "new");
        else if (Array.isArray(body.ids) && body.ids.length) q = q.in("id", body.ids);
        else return NextResponse.json({ error: "Nothing selected" }, { status: 400 });
        const rows = must(await q.select("id")) as unknown[];
        return NextResponse.json({ deleted: rows.length });
      }
      case "delete-articles": {
        const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length) return NextResponse.json({ error: "Nothing selected" }, { status: 400 });
        for (const aid of ids) await deleteArticle(id, aid, false);
        return NextResponse.json({ deleted: ids.length });
      }
      case "delete": {
        must(await db().from("sites").delete().eq("id", id).select("id"));
        return NextResponse.json({ ok: true });
      }
      default: return NextResponse.json({ error: `unknown action ${action}` }, { status: 404 });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
