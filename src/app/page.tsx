import Link from "next/link";
import { db, must } from "@/lib/db";
import type { Site } from "@/lib/types";

export const dynamic = "force-dynamic";

const ago = (iso: string) => {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};

export default async function Home() {
  const sites = must(await db().from("sites").select("*").order("created_at")) as Site[];
  const arts = must(await db().from("articles").select("site_id,status")) as { site_id: string; status: string }[];
  const kws = must(await db().from("keywords").select("site_id,status")) as { site_id: string; status: string }[];
  const jobs = must(await db().from("job_runs").select("*").order("ran_at", { ascending: false }).limit(8)) as { id: string; job: string; ok: boolean; detail: string; ran_at: string }[];
  const n = (sid: string, st: string) => arts.filter((a) => a.site_id === sid && a.status === st).length;
  const review = arts.filter((a) => a.status === "pending_review").length;
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <>
      <div className="pagehead">
        <div>
          <p className="eyebrow">{today}</p>
          {sites.length === 0 ? <h1 className="hook">Let's connect your first blog.</h1>
            : review > 0 ? <h1 className="hook"><mark className="m">{review} draft{review > 1 ? "s" : ""}</mark> {review > 1 ? "need" : "needs"} your eye.</h1>
            : <h1 className="hook">You're all caught up.</h1>}
          <p className="lede">{review > 0 ? "Review and approve them and they'll publish on their scheduled dates." : "Nothing is waiting on you. Your approved posts will go live on schedule."}</p>
        </div>
        <Link className="btn primary" href="/sites/new">Add a blog</Link>
      </div>

      {sites.length > 0 && (
        <div className="card bloglist">
          {sites.map((s) => (
            <Link key={s.id} href={`/sites/${s.id}`} className="blogrow">
              <div>
                <div className="row" style={{ gap: 12 }}>
                  <span className="name">{s.name}</span>
                  <span className={`badge ${s.publish_mode === "autopilot" ? "dark" : "blue"}`}>{s.publish_mode === "autopilot" ? "Autopilot" : "Batch preview"}</span>
                </div>
                <div className="dom">{s.domain}</div>
              </div>
              <div className="mini">
                <div><span className={`n ${n(s.id, "pending_review") ? "attn" : ""}`}>{n(s.id, "pending_review")}</span><div className="l">Review</div></div>
                <div><div className="n c-blue">{n(s.id, "approved")}</div><div className="l">Approved</div></div>
                <div><div className="n c-ok">{n(s.id, "published")}</div><div className="l">Live</div></div>
                <div><div className="n">{kws.filter((k) => k.site_id === s.id && k.status === "scheduled").length}</div><div className="l">Queued</div></div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <section className="section">
        <div className="section-head"><h2>Recent activity</h2><span className="hint">Nightly jobs and manual runs</span></div>
        <div className="card pad0">
          {jobs.length === 0 ? <div className="empty">Nothing has run yet.</div> : (
            <ul className="timeline">
              {jobs.map((j) => (
                <li key={j.id}>
                  <span className={`dot ${j.ok ? "" : "bad"}`} />
                  <span className="what"><b>{j.job}</b><span className="muted">{j.detail}</span></span>
                  <span className="when">{ago(j.ran_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
