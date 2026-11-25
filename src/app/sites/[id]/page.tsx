import Link from "next/link";
import { db, must } from "@/lib/db";
import { Badge, fmtDate } from "@/components/Badge";
import { buildCalItems, todayISO } from "@/lib/siteData";
import type { Article, Keyword } from "@/lib/types";

export const dynamic = "force-dynamic";

const ago = (iso: string) => {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};

export default async function Overview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const keywords = must(await db().from("keywords").select("*").eq("site_id", id).limit(500)) as Keyword[];
  const articles = must(await db().from("articles").select("*").eq("site_id", id).order("created_at", { ascending: false }).limit(200)) as Article[];
  const linkCount = (await db().from("internal_link_index").select("id", { count: "exact", head: true }).eq("site_id", id)).count ?? 0;
  const jobs = must(await db().from("job_runs").select("*").eq("site_id", id).order("ran_at", { ascending: false }).limit(5)) as { id: string; job: string; ok: boolean; detail: string; ran_at: string }[];
  const b = `/sites/${id}`;
  const count = (st: string) => articles.filter((x) => x.status === st).length;
  const review = articles.filter((x) => x.status === "pending_review");
  const scheduled = keywords.filter((k) => k.status === "scheduled").length;
  const today = todayISO();
  const upcoming = buildCalItems(articles, keywords).filter((i) => i.date >= today && i.status !== "published").sort((a, c) => a.date.localeCompare(c.date)).slice(0, 5);

  const steps = [
    { title: "Connect and check WordPress", text: "Test the login and index your existing posts so drafts can link to them.", href: `${b}/settings`, cta: "Open settings", done: linkCount > 0 || articles.length > 0 || keywords.length > 0 },
    { title: "Find topics", text: "Mine Google suggestions and rank them for your niche.", href: `${b}/topics`, cta: "Find topics", done: keywords.length > 0 },
    { title: "Plan the calendar", text: "Give the best topics a publish date.", href: `${b}/calendar`, cta: "Plan calendar", done: scheduled > 0 || articles.length > 0 },
    { title: "Write drafts", text: "Write articles for topics due in the next 7 days.", href: `${b}/articles`, cta: "Write drafts", done: articles.length > 0 },
    { title: "Review and approve", text: "Approved articles publish on their date by themselves.", href: `${b}/articles?status=pending_review`, cta: "Review drafts", done: count("approved") + count("published") > 0 },
  ];
  const next = steps.findIndex((s) => !s.done);

  return (
    <>
      <div className="strip">
        <Link href={`${b}/articles?status=pending_review`} className="stat"><div className={`n ${review.length ? "attn" : ""}`}>{review.length}</div><div className="l">To review</div></Link>
        <Link href={`${b}/articles?status=approved`} className="stat"><div className="n c-blue">{count("approved")}</div><div className="l">Approved</div></Link>
        <Link href={`${b}/articles?status=published`} className="stat"><div className="n c-ok">{count("published")}</div><div className="l">Live</div></Link>
        <Link href={`${b}/calendar`} className="stat"><div className="n">{scheduled}</div><div className="l">Topics queued</div></Link>
      </div>

      {next !== -1 && (
        <section className="section">
          <div className="section-head"><h2>Get started</h2><span className="hint">{steps.filter((s) => s.done).length} of {steps.length} done</span></div>
          <div className="card pad0">
            {steps.map((s, i) => (
              <div key={s.title} className={`step ${i === next ? "current" : ""}`}>
                <span className={`no ${s.done ? "done" : ""}`}>{s.done ? "✓" : i + 1}</span>
                <div><h3>{s.title}</h3><p>{s.text}</p></div>
                <span className="act">{s.done ? <Link href={s.href} className="btn sm">Open</Link> : <Link href={s.href} className={`btn sm ${i === next ? "mark" : ""}`}>{s.cta}</Link>}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-head"><h2>Needs your review</h2><Link href={`${b}/articles?status=pending_review`} className="hint">See all</Link></div>
        <div className="card pad0 tablewrap">
          <table className="queue"><tbody>
            {review.slice(0, 5).map((x) => (
              <tr key={x.id}>
                <td><Link href={`/articles/${x.id}`}>{x.title || "(untitled)"}</Link></td>
                <td><span className={`badge ${x.kind === "refresh" ? "blue" : ""}`}>{x.kind === "refresh" ? "Refresh" : "New"}</span></td>
                <td>{fmtDate(x.publish_date)}</td>
                <td className="num"><Link href={`/articles/${x.id}`} className="btn sm mark" style={{ textDecoration: "none" }}>Review</Link></td>
              </tr>
            ))}
            {review.length === 0 && <tr><td className="empty">All caught up. Nothing is waiting for review.</td></tr>}
          </tbody></table>
        </div>
      </section>

      <section className="section">
        <div className="section-head"><h2>Coming up</h2><Link href={`${b}/calendar`} className="hint">Open calendar</Link></div>
        <div className="card pad0">
          {upcoming.length === 0 ? <div className="empty">Nothing scheduled yet.</div> : (
            <ul className="timeline">
              {upcoming.map((u, i) => (
                <li key={i}><span className="dot" style={{ background: "var(--blue)" }} /><span className="what">{u.href ? <Link href={u.href}>{u.label}</Link> : u.label}</span><span className="when"><Badge status={u.status} /> &nbsp;{fmtDate(u.date)}</span></li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {jobs.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>Recent activity</h2></div>
          <div className="card pad0"><ul className="timeline">
            {jobs.map((j) => (<li key={j.id}><span className={`dot ${j.ok ? "" : "bad"}`} /><span className="what"><b>{j.job}</b><span className="muted">{j.detail}</span></span><span className="when">{ago(j.ran_at)}</span></li>))}
          </ul></div>
        </section>
      )}
    </>
  );
}
