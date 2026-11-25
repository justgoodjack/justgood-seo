import Link from "next/link";
import { db, must } from "@/lib/db";
import { ActionButton } from "@/components/ActionButton";
import { ContentCalendar } from "@/components/ContentCalendar";
import { Badge, fmtDate } from "@/components/Badge";
import { buildCalItems, todayISO } from "@/lib/siteData";
import type { Article, Keyword } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const keywords = must(await db().from("keywords").select("*").eq("site_id", id).limit(500)) as Keyword[];
  const articles = must(await db().from("articles").select("*").eq("site_id", id).limit(300)) as Article[];
  const items = buildCalItems(articles, keywords);
  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
  const unscheduled = keywords.filter((k) => k.status === "new").length;
  return (
    <>
      <div className="pagehead">
        <div>
          <p className="eyebrow">Step 1 · Plan</p>
          <h2 className="ptitle">Calendar</h2>
          <p className="lede">When each article goes live. {unscheduled > 0 ? `${unscheduled} topics are waiting for a date.` : "Every topic has a date."} Click a day to see or remove what's on it.</p>
        </div>
        <div className="row"><ActionButton url={`/api/sites/${id}/build-calendar`} label="Plan next 30 days" mark /></div>
      </div>
      {keywords.length === 0 && <div className="callout">No topics yet. <Link href={`/sites/${id}/topics`}>Find some topics first</Link>, then come back to plan them.</div>}
      <ContentCalendar siteId={id} items={items} today={todayISO()} list={
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
