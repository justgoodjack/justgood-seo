import { db, must, logJob } from "./db";
import { generate, parseJson } from "./gemini";
import type { Site } from "./types";

const host = (u: string) => {
  try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; }
};

/**
 * Run each active prompt through Gemini with Search grounding and log whether the site is cited.
 * Grounding source URIs are Google redirect links; the human-readable domain is in the chunk title.
 * Only Gemini is implemented. ChatGPT / Perplexity checks can be added behind the same shape.
 */
export async function runGeoChecks(site: Site, limit = 5) {
  const prompts = must(await db().from("geo_prompts").select("*").eq("site_id", site.id).eq("active", true)) as { id: string; prompt: string }[];
  if (!prompts.length) return { checked: 0 };

  // Oldest-checked first, only if not checked in the last 6 days (weekly cadence).
  const recent = must(await db().from("geo_checks").select("target_prompt,checked_at").eq("site_id", site.id).gte("checked_at", new Date(Date.now() - 6 * 864e5).toISOString())) as { target_prompt: string }[];
  const skip = new Set(recent.map((r) => r.target_prompt));
  const due = prompts.filter((p) => !skip.has(p.prompt)).slice(0, limit);

  const domain = site.domain.replace(/^https?:\/\//, "").replace(/^www\./, "").toLowerCase();
  let cited = 0;
  for (const p of due) {
    try {
      const r = await generate({ prompt: p.prompt, grounding: true, temperature: 0.3 });
      const hit = r.sources.filter((s) => s.title.toLowerCase().includes(domain) || host(s.uri).includes(domain));
      const mentioned = r.text.toLowerCase().includes(domain) || (site.name && r.text.toLowerCase().includes(site.name.toLowerCase()));
      const isCited = hit.length > 0 || !!mentioned;
      if (isCited) cited++;
      must(await db().from("geo_checks").insert({
        site_id: site.id, target_prompt: p.prompt, engine: "gemini", cited_bool: isCited,
        cited_urls: r.sources.slice(0, 12), answer_excerpt: r.text.slice(0, 600),
      }).select("id"));
    } catch (e) {
      await logJob("geo", site.id, false, (e as Error).message);
    }
  }
  await logJob("geo", site.id, true, `checked=${due.length} cited=${cited}`);
  return { checked: due.length, cited };
}

/** Suggest buyer-intent prompts for a new site so the tracker has something to run. */
export async function seedGeoPrompts(site: Site) {
  const r = await generate({
    prompt: `Blog niche: ${site.niche || site.name}. List 8 questions a real person would ask an AI assistant (ChatGPT, Gemini, Perplexity) where a blog in this niche could plausibly be cited as a source. Mix "best X for Y", "how do I", and comparison questions. Return a JSON array of strings only.`,
    json: true, temperature: 0.5,
  });
  const prompts = parseJson<string[]>(r.text).slice(0, 10);
  must(await db().from("geo_prompts").upsert(prompts.map((prompt) => ({ site_id: site.id, prompt })), { onConflict: "site_id,prompt", ignoreDuplicates: true }).select("id"));
  return prompts.length;
}

/** Find non-competing resource pages / blogs worth a manual pitch. Never sends anything. */
export async function findOutreach(site: Site, count = 3) {
  const recent = must(await db().from("outreach_prospects").select("id").eq("site_id", site.id).gte("created_at", new Date(Date.now() - 3 * 864e5).toISOString())) as unknown[];
  if (recent.length) return { added: 0, skipped: "recent prospects exist" };

  const r = await generate({
    grounding: true,
    temperature: 0.4,
    prompt: `Use Google Search to find ${count} real web pages (resource pages, roundups, listicles, or niche blogs) in this niche that would plausibly link to or feature a helpful article from ${site.domain}: "${site.niche || site.name}". They must not be direct competitors, big social networks, or marketplaces. For each, write a short, genuine, non-spammy pitch email (under 90 words) that offers value and does not use hype.
Return ONLY a JSON array: [{"target_url":"...","domain":"...","relevance_note":"why it fits","contact_hint":"how to reach them if visible, else empty","draft_email":"..."}]`,
  });
  const items = parseJson<{ target_url: string; domain: string; relevance_note: string; contact_hint: string; draft_email: string }[]>(r.text);
  const rows = items.filter((i) => /^https?:\/\//.test(i.target_url)).map((i) => ({ site_id: site.id, ...i }));
  if (rows.length) must(await db().from("outreach_prospects").upsert(rows, { onConflict: "site_id,target_url", ignoreDuplicates: true }).select("id"));
  await logJob("outreach", site.id, true, `added=${rows.length}`);
  return { added: rows.length };
}
