import { db, must } from "./db";
import { addDays, sleep, todayUTC } from "./config";
import { generate, parseJson } from "./gemini";
import type { Site, Keyword } from "./types";
import { similar, tokens } from "./similarity";
import { MIN_PRIORITY } from "./priority";

/** Google Autocomplete (unofficial but free and long-stable). Seed + a..z expansion. */
async function suggest(q: string): Promise<string[]> {
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=en&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data[1]) ? (data[1] as string[]) : [];
  } catch {
    return [];
  }
}

export async function mineAutocomplete(seed: string, expand = true): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const queries = [seed, `${seed} how to`, `${seed} best`, `${seed} vs`, `${seed} for`];
  if (expand) for (const c of "abcdefghijklmnopqrstuvwxyz") queries.push(`${seed} ${c}`);
  for (const q of queries) {
    for (const s of await suggest(q)) {
      const k = s.toLowerCase().trim();
      if (k.split(" ").length >= 2) counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    await sleep(120);
  }
  return counts;
}

interface Classified { phrase: string; cluster: string; intent: string; priority: number }

/** One Gemini call labels cluster / intent / priority for a batch of candidates. */
async function classify(site: Site, phrases: string[]): Promise<Classified[]> {
  const prompt = `Blog niche: ${site.niche || site.name}
Classify each candidate keyword for a content calendar. Return a JSON array of objects:
{"phrase": exact input, "cluster": short topic cluster name (3 words max, reuse names across related phrases), "intent": one of informational|commercial|transactional|navigational, "priority": integer 1-10}
Priority 10 = best blog-post opportunity for this niche (clear informational or commercial-investigation intent, specific, winnable by a new small site). Priority 1 = off-topic, navigational, brand-specific, or not worth a post.
Candidates:
${phrases.map((p) => "- " + p).join("\n")}`;
  const r = await generate({ prompt, json: true, temperature: 0.2 });
  return parseJson<Classified[]>(r.text);
}

export async function mineKeywords(site: Site, seeds?: string[]) {
  const useSeeds = (seeds?.length ? seeds : site.seed_topics).filter(Boolean);
  if (!useSeeds.length) throw new Error("No seed topics. Add some in site settings or pass seeds.");

  const merged = new Map<string, number>();
  for (const seed of useSeeds.slice(0, 5)) {
    for (const [k, n] of await mineAutocomplete(seed)) merged.set(k, (merged.get(k) ?? 0) + n);
  }

  const existing = new Set(
    must(await db().from("keywords").select("phrase").eq("site_id", site.id)).map((r: { phrase: string }) => r.phrase),
  );
  const candidates = [...merged.entries()].filter(([k]) => !existing.has(k)).sort((a, b) => b[1] - a[1]);
  // Skip anything too close to a topic we already have, or to a better one found in this same run.
  const seen = [...existing].map((p) => tokens(p));
  const fresh: [string, number][] = [];
  let similarSkipped = 0;
  for (const c of candidates) {
    const t = tokens(c[0]);
    if (seen.some((x) => similar(t, x, "normal"))) { similarSkipped++; continue; }
    seen.push(t); fresh.push(c);
    if (fresh.length >= 120) break;
  }

  let added = 0;
  let strong = 0;
  for (let i = 0; i < fresh.length; i += 40) {
    const batch = fresh.slice(i, i + 40);
    let labels: Classified[] = [];
    try {
      labels = await classify(site, batch.map(([k]) => k));
    } catch {
      /* unlabeled rows still get inserted with default priority */
    }
    const byPhrase = new Map(labels.map((l) => [l.phrase?.toLowerCase(), l]));
    const rows = batch.map(([phrase, hits]) => {
      const l = byPhrase.get(phrase);
      return {
        site_id: site.id,
        phrase,
        cluster: l?.cluster ?? null,
        intent: l?.intent ?? null,
        priority: Math.max(1, Math.min(10, l?.priority ?? 5)),
        trend_score: hits, // autocomplete hit count as a popularity proxy
        source: "autocomplete",
      };
    });
    const { error } = await db().from("keywords").upsert(rows, { onConflict: "site_id,phrase", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    added += rows.length;
    strong += rows.filter((r) => r.priority >= MIN_PRIORITY).length;
  }
  return { candidates: merged.size, added, strong, similarSkipped };
}

const dayDiff = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 864e5);

export interface Placed { date: string; cluster: string | null; tk: Set<string> }

/**
 * Give each date the best-priority topic that (1) is not the same cluster as a post within `window` days
 * on either side, counting posts already scheduled or written, and (2) is not a near-duplicate of one already placed.
 * If no such topic exists the best remaining one is used and counted as `unavoidable`.
 */
export function assign(slots: string[], pool: Keyword[], fixed: Placed[], window: number, skipSimilar: boolean) {
  const placed = [...fixed];
  const remaining = [...pool];
  const out: { kw: Keyword; date: string }[] = [];
  let unavoidable = 0;
  const tooSimilar = (k: Keyword, tk: Set<string>) => skipSimilar && placed.some((p) => similar(tk, p.tk, "normal"));
  for (const date of slots) {
    const dated = placed.filter((p) => p.date > "2000-01-01").sort((a, b) => a.date.localeCompare(b.date));
    const before = [...dated].reverse().find((p) => p.date <= date);
    const after = dated.find((p) => p.date >= date);
    const near = new Set<string>();
    for (const p of [before, after]) if (p?.cluster) near.add(p.cluster); // the posts right before and after this one
    for (const p of dated) if (p.cluster && Math.abs(dayDiff(p.date, date)) <= window) near.add(p.cluster);
    const toks = remaining.map((k) => tokens(k.phrase));
    let i = remaining.findIndex((k, n) => !tooSimilar(k, toks[n]) && (!k.cluster || !near.has(k.cluster)));
    if (i < 0) {
      i = remaining.findIndex((k, n) => !tooSimilar(k, toks[n]));
      if (i >= 0 && remaining[i].cluster) unavoidable++;
    }
    if (i < 0) break;
    const [kw] = remaining.splice(i, 1);
    out.push({ kw, date });
    placed.push({ date, cluster: kw.cluster, tk: tokens(kw.phrase) });
  }
  return { out, unavoidable, leftover: remaining };
}

async function fixedPlacements(siteId: string, excludeIds: Set<string> = new Set()): Promise<Placed[]> {
  const kws = must(await db().from("keywords").select("id,phrase,cluster,status,scheduled_date").eq("site_id", siteId).in("status", ["scheduled", "drafted", "published"])) as Keyword[];
  const arts = must(await db().from("articles").select("keyword_id,publish_date,status").eq("site_id", siteId).not("publish_date", "is", null).neq("status", "rejected")) as { keyword_id: string | null; publish_date: string }[];
  const byId = new Map(kws.map((k) => [k.id, k]));
  const out: Placed[] = [];
  for (const k of kws) if (k.scheduled_date && k.status === "scheduled" && !excludeIds.has(k.id)) out.push({ date: k.scheduled_date, cluster: k.cluster, tk: tokens(k.phrase) });
  for (const a of arts) { const k = a.keyword_id ? byId.get(a.keyword_id) : undefined; if (k) out.push({ date: a.publish_date, cluster: k.cluster, tk: tokens(k.phrase) }); }
  // topics already written still count for similarity even without a date
  for (const k of kws) if (k.status !== "scheduled" && !k.scheduled_date) out.push({ date: "1970-01-01", cluster: null, tk: tokens(k.phrase) });
  return out;
}

/** The dates to fill: starting today, every day in the window that is at least `gap` days from any other post. */
export function pickSlots(today: string, days: number, gap: number, occupied: string[]): string[] {
  const taken = [...occupied];
  const slots: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(today, i);
    if (taken.every((t) => Math.abs(dayDiff(t, d)) >= gap)) { slots.push(d); taken.push(d); }
  }
  return slots;
}

/** Trust the browser's idea of "today" (the server clock can be a day off), within one day of UTC. */
function validToday(t?: string): string {
  const utc = todayUTC();
  return t && /^\d{4}-\d{2}-\d{2}$/.test(t) && Math.abs(dayDiff(t, utc)) <= 1 ? t : utc;
}

/**
 * Plan the next `days` days starting today, filling every open day at the chosen rhythm,
 * never putting a cluster next to itself or two near-identical topics.
 */
export async function buildCalendar(site: Site, opts: { days?: number; cadence?: number; today?: string } = {}) {
  const days = opts.days ?? 30;
  const cadence = Math.min(90, Math.max(1, Math.round(opts.cadence ?? site.cadence_per_month)));
  if (opts.cadence && cadence !== site.cadence_per_month) await db().from("sites").update({ cadence_per_month: cadence }).eq("id", site.id);
  const today = validToday(opts.today);
  const gap = Math.max(1, Math.round(30 / cadence));

  const fixed = await fixedPlacements(site.id);
  const occupied = fixed.map((f) => f.date).filter((d) => d > "2000-01-01");
  const slots = pickSlots(today, days, gap, occupied);

  const pool = must(
    await db().from("keywords").select("*").eq("site_id", site.id).eq("status", "new").gte("priority", MIN_PRIORITY)
      .order("priority", { ascending: false }).order("trend_score", { ascending: false }).limit(400),
  ) as Keyword[];

  const { out, unavoidable } = assign(slots, pool, fixed, 1, true);
  for (const { kw, date } of out) await db().from("keywords").update({ status: "scheduled", scheduled_date: date }).eq("id", kw.id);
  const dates = out.map((o) => o.date).sort();
  return { scheduled: out.length, firstDate: dates[0] ?? null, lastDate: dates[dates.length - 1] ?? null, openDays: slots.length - out.length, unavoidable };
}

/** Re-order topics that are scheduled but not written yet so no cluster sits next to itself. Dates stay the same. */
export async function rebalanceCalendar(site: Site) {
  const arts = must(await db().from("articles").select("keyword_id").eq("site_id", site.id)) as { keyword_id: string | null }[];
  const written = new Set(arts.map((a) => a.keyword_id).filter(Boolean) as string[]);
  const sched = must(await db().from("keywords").select("*").eq("site_id", site.id).eq("status", "scheduled").not("scheduled_date", "is", null)) as Keyword[];
  const movable = sched.filter((k) => !written.has(k.id));
  if (movable.length < 2) return { moved: 0, unavoidable: 0, total: movable.length };
  const slots = movable.map((k) => k.scheduled_date as string).sort();
  const fixed = await fixedPlacements(site.id, new Set(movable.map((k) => k.id)));
  const pool = [...movable].sort((a, b) => b.priority - a.priority || b.trend_score - a.trend_score);
  const { out, unavoidable } = assign(slots, pool, fixed, 1, false);
  const before = new Map(movable.map((k) => [k.id, k.scheduled_date]));
  let moved = 0;
  for (const { kw, date } of out) if (before.get(kw.id) !== date) { await db().from("keywords").update({ scheduled_date: date }).eq("id", kw.id); moved++; }
  return { moved, unavoidable, total: movable.length };
}
