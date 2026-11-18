import { db, must, logJob } from "./db";
import { addDays, todayUTC } from "./config";
import { findStockPhoto, generateImage } from "./media";
import { faqJsonLd, withSchema, writeArticle } from "./writer";
import { indexPost, relatedLinks } from "./linker";
import { strip, WP } from "./wordpress";
import { generate } from "./gemini";
import type { Article, Keyword, Site } from "./types";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function loadSite(id: string): Promise<Site> {
  return must(await db().from("sites").select("*").eq("id", id).single()) as Site;
}

/** Turn a topic into a text-free visual scene description for the image model (never pass titles to it). */
export async function visualPrompt(site: Site, topic: string): Promise<string> {
  try {
    const r = await generate({
      prompt: `Write ONE sentence (max 40 words) describing a photograph that would illustrate a blog article about "${topic}" for a ${site.niche || "general"} blog. Style: ${site.image_style}. Describe only visible subjects, setting, light and mood. The scene must contain NO writing of any kind: no signs, placards, posters, books, screens, labels. Do not mention the article title. Output only the sentence.`,
      temperature: 0.6,
    });
    return r.text.trim().replace(/^["']|["']$/g, "");
  } catch {
    return `${site.niche || "editorial"} concept photograph, ${site.image_style}`;
  }
}

/** Featured image: Cloudflare AI first, Pexels stock photo as fallback. Uploaded to the WP media library. */
export async function attachImage(site: Site, title: string, imagePrompt: string, slug: string, stockQuery?: string, mode: "auto" | "ai" | "stock" = "auto", exclude: string[] = []): Promise<{ id: number; url: string; source: string; stockId?: string } | null> {
  const wp = new WP(site);
  if (mode !== "stock") try {
    const ai = await generateImage(imagePrompt || (await visualPrompt(site, title)));
    if (ai) {
      const up = await wp.uploadMedia(ai, `${slug}.png`, "image/png", title);
      return { ...up, source: "ai" };
    }
  } catch { /* fall through to stock */ }
  if (mode !== "ai") try {
    const stock = await findStockPhoto([stockQuery ?? title, site.niche], exclude);
    if (stock) {
      const up = await wp.uploadMedia(stock.bytes, `${slug}.jpg`, "image/jpeg", `${title} (${stock.credit})`);
      return { ...up, source: "stock", stockId: stock.stockId };
    }
  } catch { /* no image */ }
  return null;
}

/** Replace <!--IMG: description--> placeholders with real uploaded images. Unresolved ones are removed. */
export async function fillInlineImages(site: Site, html: string, title: string, slug: string, max = 2): Promise<string> {
  const re = /<!--\s*IMG:\s*([\s\S]*?)-->/g;
  const found = [...html.matchAll(re)].slice(0, max);
  let out = html;
  let n = 0;
  for (const m of found) {
    n++;
    const desc = m[1].trim().slice(0, 200);
    const img = await attachImage(site, desc, `${desc}, ${site.image_style}`, `${slug}-${n}`, `${desc} ${site.niche}`.trim()).catch(() => null);
    const fig = img ? `<figure class="wp-block-image"><img src="${img.url}" alt="${desc.replace(/"/g, "&quot;")}" loading="lazy" /></figure>` : "";
    out = out.replace(m[0], fig);
  }
  return out.replace(re, "");
}

/** Draft one new article for a scheduled keyword (+ featured image uploaded to WP media). */
export async function generateForKeyword(site: Site, kw: Keyword): Promise<string> {
  const links = await relatedLinks(site.id, kw.phrase, 5).catch(() => []);
  const draft = await writeArticle(site, kw.phrase, links);

  draft.html = await fillInlineImages(site, draft.html, draft.title, draft.slug || slugify(kw.phrase));
  const img = await attachImage(site, draft.title, draft.imagePrompt, draft.slug || slugify(kw.phrase));
  const mediaId = img?.id ?? null;
  const imgUrl = img?.url ?? null;

  const status = site.publish_mode === "autopilot" ? "approved" : "pending_review";
  const row = must(
    await db().from("articles").insert({
      site_id: site.id,
      keyword_id: kw.id,
      kind: "new",
      title: draft.title,
      slug: draft.slug,
      html_body: draft.html,
      faq_jsonld: faqJsonLd(draft.faq),
      meta_desc: draft.metaDesc,
      featured_img_url: imgUrl,
      featured_media_id: mediaId,
      status,
      publish_date: kw.scheduled_date ?? addDays(todayUTC(), 1),
      sources: draft.sources.slice(0, 15),
    }).select("id").single(),
  ) as { id: string };
  await db().from("keywords").update({ status: "drafted" }).eq("id", kw.id);
  return row.id;
}

/** Rewrite a decaying post. Row was queued by the GSC job with notes explaining why. */
export async function generateRefresh(site: Site, art: Article): Promise<void> {
  if (!art.wp_post_id) throw new Error("Refresh article has no wp_post_id");
  const wp = new WP(site);
  const cur = await wp.getPostRaw(art.wp_post_id);
  const links = await relatedLinks(site.id, cur.title.raw, 5, art.wp_post_id).catch(() => []);
  const draft = await writeArticle(
    site,
    cur.title.raw,
    links,
    `This is a REFRESH of an existing post that is losing search performance (${art.notes ?? ""}). Keep the topic and the same intent, but update facts with fresh grounded sources, fix gaps, tighten the structure, and improve the opening answers. Current post text for reference:\n${strip(cur.content.raw).slice(0, 6000)}`,
  );
  draft.html = await fillInlineImages(site, draft.html, draft.title, slugify(draft.title));
  const status = site.publish_mode === "autopilot" ? "approved" : "pending_review";
  must(
    await db().from("articles").update({
      title: draft.title,
      html_body: draft.html,
      faq_jsonld: faqJsonLd(draft.faq),
      meta_desc: draft.metaDesc,
      sources: draft.sources.slice(0, 15),
      status,
      publish_date: todayUTC(),
    }).eq("id", art.id).select("id"),
  );
}

/** Push one approved article to WordPress and index it for internal linking. */
export async function publishArticle(site: Site, art: Article): Promise<{ id: number; link: string }> {
  const wp = new WP(site);
  const res = await wp.publish({
    postId: art.wp_post_id,
    title: art.title,
    slug: art.slug,
    html: withSchema(art.html_body, art.faq_jsonld),
    excerpt: art.meta_desc,
    mediaId: art.featured_media_id,
    categoryId: site.default_category_id,
  });
  must(
    await db().from("articles").update({ status: "published", wp_post_id: res.id, wp_link: res.link, published_at: new Date().toISOString() }).eq("id", art.id).select("id"),
  );
  if (art.keyword_id) await db().from("keywords").update({ status: "published" }).eq("id", art.keyword_id);
  await indexPost(site.id, { id: res.id, link: res.link, title: art.title, summary: art.meta_desc }).catch(() => undefined);
  return res;
}

/**
 * Generation work queue, shared by the cron and the dashboard "Generate now" button.
 * Priority: queued refreshes, then scheduled keywords inside the next 7 days that lack a draft.
 * Stops starting new items once `budgetMs` has elapsed (Vercel Hobby cap is 300s per run).
 */
export async function runGeneration(opts: { siteId?: string; budgetMs?: number; maxItems?: number } = {}) {
  const started = Date.now();
  const budget = opts.budgetMs ?? 200_000;
  const maxItems = opts.maxItems ?? 6;
  const out: string[] = [];
  let done = 0;

  const sitesQ = db().from("sites").select("*");
  const sites = must(opts.siteId ? await sitesQ.eq("id", opts.siteId) : await sitesQ) as Site[];

  const horizon = addDays(todayUTC(), 7);
  // Round-robin so one busy site cannot starve the others.
  type Job = { site: Site; refresh?: Article; kw?: Keyword };
  const perSite: Job[][] = [];
  for (const site of sites) {
    const jobs: Job[] = [];
    const refreshes = must(await db().from("articles").select("*").eq("site_id", site.id).eq("status", "queued").eq("kind", "refresh").limit(2)) as Article[];
    refreshes.forEach((refresh) => jobs.push({ site, refresh }));
    const kws = must(
      await db().from("keywords").select("*").eq("site_id", site.id).eq("status", "scheduled").lte("scheduled_date", horizon).order("scheduled_date").limit(10),
    ) as Keyword[];
    kws.forEach((kw) => jobs.push({ site, kw }));
    perSite.push(jobs);
  }

  outer: for (let round = 0; ; round++) {
    let any = false;
    for (const jobs of perSite) {
      const job = jobs[round];
      if (!job) continue;
      any = true;
      if (done >= maxItems || Date.now() - started > budget) break outer;
      try {
        if (job.refresh) {
          await generateRefresh(job.site, job.refresh);
          out.push(`refresh:${job.site.name}:${job.refresh.id}`);
        } else if (job.kw) {
          await generateForKeyword(job.site, job.kw);
          out.push(`draft:${job.site.name}:${job.kw.phrase}`);
        }
        await logJob("generate", job.site.id, true, job.kw?.phrase ?? job.refresh?.id ?? "");
      } catch (e) {
        const msg = (e as Error).message;
        out.push(`ERROR:${job.site.name}:${msg.slice(0, 120)}`);
        await logJob("generate", job.site.id, false, msg);
        if (job.refresh) await db().from("articles").update({ status: "failed", notes: msg.slice(0, 500) }).eq("id", job.refresh.id);
      }
      done++;
    }
    if (!any) break;
  }
  return out;
}

/** Publish everything approved whose date has arrived. */
export async function runPublishing(opts: { siteId?: string; limit?: number } = {}) {
  const q = db().from("articles").select("*").eq("status", "approved").lte("publish_date", todayUTC()).order("publish_date").limit(opts.limit ?? 10);
  const arts = must(opts.siteId ? await q.eq("site_id", opts.siteId) : await q) as Article[];
  const siteCache = new Map<string, Site>();
  const out: string[] = [];
  for (const a of arts) {
    try {
      let site = siteCache.get(a.site_id);
      if (!site) siteCache.set(a.site_id, (site = await loadSite(a.site_id)));
      const r = await publishArticle(site, a);
      out.push(`published:${site.name}:${r.link}`);
      await logJob("publish", site.id, true, r.link);
    } catch (e) {
      const msg = (e as Error).message;
      out.push(`ERROR:${a.id}:${msg.slice(0, 120)}`);
      await db().from("articles").update({ status: "failed", notes: msg.slice(0, 500) }).eq("id", a.id);
      await logJob("publish", a.site_id, false, msg);
    }
  }
  return out;
}

export { loadSite, generate as _generate };
