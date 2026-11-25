import Link from "next/link";
import { db, must } from "@/lib/db";
import { PlanControls } from "@/components/PlanControls";
import { ContentCalendar } from "@/components/ContentCalendar";
import { Badge, fmtDate } from "@/components/Badge";
import { buildCalItems, getSite, todayISO } from "@/lib/siteData";
import { MIN_PRIORITY } from "@/lib/priority";
import { coverage } from "@/lib/coverage";
import type { Article, Keyword } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = await getSite(id);
  const keywords = must(await db().from("keywords").select("*").eq("site_id", id).limit(500)) as Keyword[];
  const articles = must(await db().from("articles").select("*").eq("site_id", id).limit(300)) as Article[];
  const items = buildCalItems(articles, keywords);
  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
  const today = todayISO();
  const cov = coverage(today, items.map((i) => ({ date: i.date, kind: i.kind, status: i.status })));
  const emptyDates = cov.days.filter((d) => d.state === "empty").map((d) => d.date);
  const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const unscheduled = keywords.filter((k) => k.status === "new" && k.priority >= MIN_PRIORITY).length;
  return (
    <>
      <div className="pagehead">
        <div>
          <p className="eyebrow">Step 1 · Plan</p>
          <h2 className="ptitle">Calendar</h2>
          <p className="lede">When each article goes live. {unscheduled > 0 ? `${unscheduled} priority ${MIN_PRIORITY}+ topics are waiting for a date.` : `Every priority ${MIN_PRIORITY}+ topic has a date.`} Topics from the same cluster are never placed next to each other. Click a day to see or remove what's on it.</p>
        </div>
        <PlanControls siteId={id} cadence={site.cadence_per_month} empty={emptyDates.length} />
      </div>
      <div className="card">
        <div className="row between" style={{ marginBottom: 10 }}>
          <strong>Daily coverage, next {cov.days.length} days</strong>
          <span className="muted"><span className="c-ok"><b>{cov.ready}</b> ready</span> &nbsp;·&nbsp; <span className="c-blue"><b>{cov.planned}</b> need work</span> &nbsp;·&nbsp; <span className={cov.empty ? "c-bad" : ""}><b>{cov.empty}</b> empty</span></span>
        </div>
        <div className="cover" role="img" aria-label={`${cov.ready} ready, ${cov.planned} need work, ${cov.empty} empty`}>
          {cov.days.map((d) => <span key={d.date} className={`cv s-${d.state}`} title={`${fmt(d.date)}: ${d.state === "ready" ? "approved, will post" : d.state === "planned" ? "planned, still needs writing or approval" : "nothing scheduled"}`} />)}
        </div>
        <p className="muted" style={{ margin: "10px 0 0" }}>
          {cov.empty > 0 ? <><b className="c-bad">Nothing will post on:</b> {emptyDates.slice(0, 10).map(fmt).join(", ")}{emptyDates.length > 10 ? ` and ${emptyDates.length - 10} more` : ""}. Use the Fill button above.</>
            : cov.planned > 0 ? <>Every day has something lined up. {cov.planned} still need to be written or approved before they can post. <Link href={`/sites/${id}/articles`}>Open Articles</Link></> : "Every day is ready to post."}
        </p>
      </div>
      {keywords.length === 0 && <div className="callout">No topics yet. <Link href={`/sites/${id}/topics`}>Find some topics first</Link>, then come back to plan them.</div>}
      <ContentCalendar siteId={id} items={items} today={today} gapDates={emptyDates} list={
        <div className="card pad0 tablewrap"><table>
          <thead><tr><th>Date</th><th>Title or topic</th><th>Status</th></tr></thead>
          <tbody>
            {sorted.map((i) => (<tr key={i.kind + i.id}><td style={{ whiteSpace: "nowrap" }}>{fmtDate(i.date)}</td><td>{i.href ? <Link href={i.href}>{i.label}</Link> : <span style={{ fontWeight: 600 }}>{i.label}</span>}</td><td><Badge status={i.status} /></td></tr>))}
            {sorted.length === 0 && <tr><td colSpan={3} className="empty">Nothing is scheduled yet.</td></tr>}
          </tbody>
        </table></div>
      } />
    </>
  );
}
