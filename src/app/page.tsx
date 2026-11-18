import Link from "next/link";
import { db, must } from "@/lib/db";
import type { Site } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const sites = must(await db().from("sites").select("*").order("created_at")) as Site[];
  const arts = must(await db().from("articles").select("site_id,status")) as { site_id: string; status: string }[];
  const jobs = must(await db().from("job_runs").select("*").order("ran_at", { ascending: false }).limit(12)) as { id: string; job: string; ok: boolean; detail: string; ran_at: string }[];
  const count = (sid: string, st: string) => arts.filter((a) => a.site_id === sid && a.status === st).length;
  const review = arts.filter((a) => a.status === "pending_review").length;
  return (
    <>
      <div className="row between"><h1>Blogs</h1><Link className="btn primary" href="/sites/new">Add blog</Link></div>
      {review > 0 && <p className="card">{review} draft{review > 1 ? "s" : ""} waiting for your review.</p>}
      {sites.length === 0 && <p className="card">No blogs yet. Add your first one to start.</p>}
      {sites.map((s) => (
        <Link key={s.id} href={`/sites/${s.id}`} style={{ textDecoration: "none", color: "inherit" }}>
          <div className="card row between">
            <div><strong>{s.name}</strong> <span className="muted">{s.domain}</span></div>
            <div className="row">
              <span className={`pill ${s.publish_mode === "autopilot" ? "bad" : "ok"}`}>{s.publish_mode === "autopilot" ? "autopilot" : "batch preview"}</span>
              <span className="pill">{count(s.id, "pending_review")} to review</span>
              <span className="pill">{count(s.id, "approved")} approved</span>
              <span className="pill">{count(s.id, "published")} live</span>
            </div>
          </div>
        </Link>
      ))}
      <h2>Recent job runs</h2>
      <div className="card tablewrap"><table><tbody>
        {jobs.map((j) => (<tr key={j.id}><td>{new Date(j.ran_at).toLocaleString()}</td><td>{j.job}</td><td><span className={`pill ${j.ok ? "ok" : "bad"}`}>{j.ok ? "ok" : "failed"}</span></td><td className="muted">{j.detail}</td></tr>))}
        {jobs.length === 0 && <tr><td className="muted">Nothing has run yet.</td></tr>}
      </tbody></table></div>
    </>
  );
}
