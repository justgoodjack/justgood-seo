import { db, must } from "./db";
import { addDays, sleep, todayUTC } from "./config";
import { generate, parseJson } from "./gemini";
import type { Site, Keyword } from "./types";

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
  const fresh = [...merged.entries()].filter(([k]) => !existing.has(k)).sort((a, b) => b[1] - a[1]).slice(0, 120);

  let added = 0;
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
  }
  return { candidates: merged.size, added };
}

/** Assign best unscheduled keywords to future dates at the site's cadence. */
export async function buildCalendar(site: Site, days = 30) {
  const scheduled = must(
    await db().from("keywords").select("scheduled_date").eq("site_id", site.id).eq("status", "scheduled").order("scheduled_date", { ascending: false }).limit(1),
  ) as { scheduled_date: string }[];
  const start = scheduled[0]?.scheduled_date ? addDays(scheduled[0].scheduled_date, 1) : addDays(todayUTC(), 1);

  const gap = Math.max(1, Math.floor(30 / site.cadence_per_month));
  const slots = Math.max(1, Math.floor((days * site.cadence_per_month) / 30));

  const picks = must(
    await db().from("keywords").select("*").eq("site_id", site.id).eq("status", "new").gte("priority", 5)
      .order("priority", { ascending: false }).order("trend_score", { ascending: false }).limit(slots),
  ) as Keyword[];

  let n = 0;
  for (const k of picks) {
    const date = addDays(start, n * gap);
    await db().from("keywords").update({ status: "scheduled", scheduled_date: date }).eq("id", k.id);
    n++;
  }
  return { scheduled: n, firstDate: start };
}
