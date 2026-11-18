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
  const arts = must(await db().from("articles").select("site_id,status,publish_date")) as { site_id: string; status: string; publish_date: string | null }[];
  const kws = must(await db().from("keywords").select("site_id,status")) as { site_id: string; status: string }[];
  const jobs = must(await db().from("job_runs").select("*").order("ran_at", { ascending: false }).limit(10)) as { id: string; job: string; ok: boolean; detail: string; ran_at: string }[];
  const n = (sid: string, st: string) => arts.filter((a) => a.site_id === sid && a.status === st).length;
  const review = arts.filter((a) => a.status === "pending_review").length;
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <>
      <div className="pagehead">
        <div>
          <p className="eyebrow">{today}</p>
          <h1>Your blogs</h1>
          <p className="lede">Drafts, schedules and search performance across every site you run.</p>
        </div>
        <Link className="btn primary" href="/sites/new">+ Add a blog</Link>
      </div>

      {review > 0 && (
        <div className="callout">
          <strong style={{ fontSize: 22, fontFamily: "var(--serif)" }}>{review}</strong>
          <span>draft{review > 1 ? "s are" : " is"} waiting for your review. Open a blog below to approve {review > 1 ? "them" : "it"}.</span>
        </div>
      )}

      <div className="rise">
        {sites.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: 48 }}>
            <h2>No blogs yet</h2>
            <p className="lede" style={{ margin: "8px auto 20px" }}>Connect your first WordPress site to start planning and publishing.</p>
            <Link className="btn primary" href="/sites/new">Add your first blog</Link>
          </div>
        )}
        {sites.map((s) => (
          <Link key={s.id} href={`/sites/${s.id}`} className="blogcard">
            <div className="row" style={{ gap: 12 }}>
              <h2>{s.name}</h2>
              <span className={`badge ${s.publish_mode === "autopilot" ? "warn" : "ok"}`}>{s.publish_mode === "autopilot" ? "Autopilot" : "Batch preview"}</span>
            </div>
            <p className="dom">{s.domain}</p>
            <div className="stats">
              <div className={`stat ${n(s.id, "pending_review") ? "hot" : ""}`}><div className="n">{n(s.id, "pending_review")}</div><div className="l">To review</div></div>
              <div className="stat"><div className="n">{n(s.id, "approved")}</div><div className="l">Approved</div></div>
              <div className="stat"><div className="n">{n(s.id, "published")}</div><div className="l">Live</div></div>
              <div className="stat"><div className="n">{kws.filter((k) => k.site_id === s.id && k.status === "scheduled").length}</div><div className="l">Queued topics</div></div>
            </div>
          </Link>
        ))}
      </div>

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
