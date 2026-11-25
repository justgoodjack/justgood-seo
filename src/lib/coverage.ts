// Day-by-day view of the schedule: is something going to be posted on each day?
export type DayState = "ready" | "planned" | "empty";
export interface CovItem { date: string; kind: "article" | "topic"; status: string }
export interface CovDay { date: string; state: DayState }

const add = (d: string, n: number) => new Date(Date.parse(d + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);

/**
 * ready   = an approved or live article is dated that day (it will post, or already did)
 * planned = a draft awaiting review, or a topic not written yet (needs work before it can post)
 * empty   = nothing will post that day (failed articles do not count)
 */
export function coverage(today: string, items: CovItem[], minDays = 30): { days: CovDay[]; ready: number; planned: number; empty: number } {
  const future = items.filter((i) => i.date >= today).map((i) => i.date).sort();
  const last = future[future.length - 1] ?? today;
  const end = add(today, minDays - 1) > last ? add(today, minDays - 1) : last;
  const days: CovDay[] = [];
  for (let d = today; d <= end; d = add(d, 1)) {
    const its = items.filter((i) => i.date === d);
    const state: DayState = its.some((i) => i.kind === "article" && (i.status === "approved" || i.status === "published")) ? "ready"
      : its.some((i) => (i.kind === "topic" && i.status === "scheduled") || (i.kind === "article" && (i.status === "pending_review" || i.status === "queued"))) ? "planned" : "empty";
    days.push({ date: d, state });
  }
  return { days, ready: days.filter((x) => x.state === "ready").length, planned: days.filter((x) => x.state === "planned").length, empty: days.filter((x) => x.state === "empty").length };
}
