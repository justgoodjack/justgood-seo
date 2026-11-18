import { db, must } from "./db";
import { embed } from "./gemini";
import { WP } from "./wordpress";
import type { Site } from "./types";

export interface LinkCandidate { wp_post_id: number; url: string; title: string; summary: string; similarity: number }

export async function relatedLinks(siteId: string, text: string, count = 5, excludePostId?: number | null): Promise<LinkCandidate[]> {
  const count_ = await db().from("internal_link_index").select("id", { count: "exact", head: true }).eq("site_id", siteId);
  if (!count_.count) return [];
  const e = await embed(text, "RETRIEVAL_QUERY");
  const { data, error } = await db().rpc("match_internal_links", {
    p_site_id: siteId,
    p_embedding: e,
    p_count: count,
    p_exclude_post_id: excludePostId ?? null,
  });
  if (error) throw new Error(error.message);
  return (data as LinkCandidate[]).filter((r) => r.similarity > 0.45);
}

export async function indexPost(siteId: string, post: { id: number; link: string; title: string; summary: string }) {
  const e = await embed(`${post.title}\n${post.summary}`);
  must(
    await db().from("internal_link_index").upsert(
      { site_id: siteId, wp_post_id: post.id, url: post.link, title: post.title, summary: post.summary.slice(0, 500), embedding: e, updated_at: new Date().toISOString() },
      { onConflict: "site_id,wp_post_id" },
    ).select("id"),
  );
}

/** Index every published post already on the WordPress site (run once per site, then it self-maintains). */
export async function syncExistingPosts(site: Site, limit = 40) {
  const wp = new WP(site);
  const posts = await wp.listPublished();
  const have = new Set(
    (must(await db().from("internal_link_index").select("wp_post_id").eq("site_id", site.id)) as { wp_post_id: number }[]).map((r) => r.wp_post_id),
  );
  const todo = posts.filter((p) => !have.has(p.id)).slice(0, limit); // embed quota friendly; call again for more
  for (const p of todo) await indexPost(site.id, { id: p.id, link: p.link, title: p.title, summary: p.excerpt });
  return { totalOnSite: posts.length, indexedNow: todo.length, remaining: posts.length - have.size - todo.length };
}
