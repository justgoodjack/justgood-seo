// Free, instant near-duplicate detection for topics. Pure functions, safe on server and client.

const STOP = new Set(("a an the and or of to for in on at with by from near me my your you how what why when where which is are be do does can i it this that vs versus best top ways way tips").split(" "));

function stem(w: string): string {
  if (w.length > 4) {
    if (w.endsWith("ies")) w = w.slice(0, -3) + "y";
    else w = w.replace(/(ing|ed|es|s)$/, "");
  }
  if (w.length > 4) w = w.replace(/e$/, "");
  return w;
}

export function tokens(phrase: string): Set<string> {
  return new Set(phrase.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w)).map(stem));
}

export type Strictness = "strict" | "normal" | "loose";
const LEVELS: Record<Strictness, { j: number; c: number }> = {
  strict: { j: 0.75, c: 1.01 }, // near-identical wording only
  normal: { j: 0.6, c: 0.85 },
  loose: { j: 0.45, c: 0.7 },
};

export function similar(a: Set<string>, b: Set<string>, level: Strictness = "normal"): boolean {
  if (!a.size || !b.size) return false;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const min = Math.min(a.size, b.size);
  if (min < 2) return inter === a.size && inter === b.size; // one-word phrases must match exactly
  const jaccard = inter / (a.size + b.size - inter);
  const containment = inter / min;
  return jaccard >= LEVELS[level].j || containment >= LEVELS[level].c;
}

export interface Simple { id: string; phrase: string; status: string; priority: number; trend_score?: number }
const RANK: Record<string, number> = { published: 4, drafted: 3, scheduled: 2, new: 1, skipped: 0 };

export interface SimilarGroup<T extends Simple> { keeper: T; dupes: T[] }

/** Groups near-duplicate topics. The keeper is the one already written/published, else the strongest. */
export function groupSimilar<T extends Simple>(rows: T[], level: Strictness = "normal"): SimilarGroup<T>[] {
  const tk = rows.map((r) => tokens(r.phrase));
  const parent = rows.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) if (similar(tk[i], tk[j], level)) parent[find(j)] = find(i);
  const byRoot = new Map<number, T[]>();
  rows.forEach((r, i) => byRoot.set(find(i), [...(byRoot.get(find(i)) ?? []), r]));
  const groups: SimilarGroup<T>[] = [];
  for (const members of byRoot.values()) {
    if (members.length < 2) continue;
    const sorted = [...members].sort((a, b) => (RANK[b.status] ?? 0) - (RANK[a.status] ?? 0) || b.priority - a.priority || (b.trend_score ?? 0) - (a.trend_score ?? 0) || a.phrase.length - b.phrase.length);
    groups.push({ keeper: sorted[0], dupes: sorted.slice(1) });
  }
  return groups.sort((a, b) => b.dupes.length - a.dupes.length);
}
