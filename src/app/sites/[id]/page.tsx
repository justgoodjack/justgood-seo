import Link from "next/link";
import { db, must } from "@/lib/db";
import { ActionButton } from "@/components/ActionButton";
import { SettingsForm } from "@/components/SettingsForm";
import type { Article, Keyword, Site } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = must(await db().from("sites").select("*").eq("id", id).single()) as Site;
  const keywords = must(await db().from("keywords").select("*").eq("site_id", id).order("status").order("scheduled_date", { nullsFirst: false }).order("priority", { ascending: false }).limit(150)) as Keyword[];
  const articles = must(await db().from("articles").select("*").eq("site_id", id).order("created_at", { ascending: false }).limit(100)) as Article[];
  const geo = must(await db().from("geo_checks").select("*").eq("site_id", id).order("checked_at", { ascending: false }).limit(20)) as { id: string; target_prompt: string; cited_bool: boolean; checked_at: string }[];
  const outreach = must(await db().from("outreach_prospects").select("*").eq("site_id", id).order("created_at", { ascending: false }).limit(20)) as { id: string; target_url: string; domain: string; relevance_note: string; draft_email: string; status: string }[];
  const linkCount = (await db().from("internal_link_index").select("id", { count: "exact", head: true }).eq("site_id", id)).count ?? 0;
  const a = (action: string) => `/api/sites/${id}/${action}`;
  const review = articles.filter((x) => x.status === "pending_review");

  return (
    <>
      <p><Link href="/">All blogs</Link></p>
      <h1>{site.name} <span className="muted">{site.domain}</span></h1>

      <h2>Pipeline</h2>
      <div className="card">
        <p className="muted">Run in order the first time. 1) Test WP, 2) index existing posts ({linkCount} indexed), 3) mine keywords, 4) build calendar, 5) generate drafts.</p>
        <div className="row">
          <ActionButton url={a("test-wp")} label="1. Test WordPress" />
          <ActionButton url={a("sync-posts")} label="2. Index existing posts" />
          <ActionButton url={a("mine-keywords")} label="3. Mine keywords" />
          <ActionButton url={a("build-calendar")} label="4. Build 30-day calendar" />
          <ActionButton url={a("generate")} body={{ count: 3 }} label="5. Generate 3 drafts" primary />
          <ActionButton url={a("publish-due")} label="Publish due now" confirm="Publish all approved articles dated today or earlier?" />
        </div>
      </div>

      <h2>Needs review ({review.length})</h2>
      <div className="card tablewrap">
        <table><thead><tr><th>Title</th><th>Type</th><th>Publish date</th></tr></thead><tbody>
          {review.map((x) => (<tr key={x.id}><td><Link href={`/articles/${x.id}`}>{x.title || "(untitled)"}</Link></td><td>{x.kind}</td><td>{x.publish_date}</td></tr>))}
          {review.length === 0 && <tr><td className="muted" colSpan={3}>Nothing waiting.</td></tr>}
        </tbody></table>
      </div>

      <h2>All articles</h2>
      <div className="card tablewrap">
        <table><thead><tr><th>Title</th><th>Status</th><th>Date</th><th>Live</th></tr></thead><tbody>
          {articles.map((x) => (<tr key={x.id}><td><Link href={`/articles/${x.id}`}>{x.title || "(queued refresh)"}</Link></td><td><span className={`pill ${x.status === "published" ? "ok" : x.status === "failed" ? "bad" : ""}`}>{x.status}</span></td><td>{x.publish_date}</td><td>{x.wp_link && <a href={x.wp_link} target="_blank" rel="noreferrer">view</a>}</td></tr>))}
        </tbody></table>
      </div>

      <h2>Keyword calendar</h2>
      <div className="card tablewrap">
        <table><thead><tr><th>Keyword</th><th>Cluster</th><th>Intent</th><th>Pri</th><th>Status</th><th>Date</th></tr></thead><tbody>
          {keywords.map((k) => (<tr key={k.id}><td>{k.phrase}</td><td>{k.cluster}</td><td>{k.intent}</td><td>{k.priority}</td><td>{k.status}</td><td>{k.scheduled_date}</td></tr>))}
          {keywords.length === 0 && <tr><td className="muted" colSpan={6}>No keywords yet. Add seed topics in settings, then Mine keywords.</td></tr>}
        </tbody></table>
      </div>

      <h2>Search Console</h2>
      <div className="card row">
        <ActionButton url={a("gsc-sync")} label="Sync GSC and queue refreshes" />
        <span className="muted">Needs a Search Console property in settings and the service account added as a user.</span>
      </div>

      <h2>AI visibility (GEO)</h2>
      <div className="card">
        <div className="row"><ActionButton url={a("seed-geo")} label="Suggest tracking prompts" /><ActionButton url={a("geo-run")} label="Run checks now" /></div>
        <table><tbody>
          {geo.map((g) => (<tr key={g.id}><td>{g.target_prompt}</td><td><span className={`pill ${g.cited_bool ? "ok" : "bad"}`}>{g.cited_bool ? "cited" : "not cited"}</span></td><td className="muted">{new Date(g.checked_at).toLocaleDateString()}</td></tr>))}
        </tbody></table>
      </div>

      <h2>Outreach prospects</h2>
      <div className="card">
        <ActionButton url={a("outreach")} label="Find prospects" />
        {outreach.map((o) => (<details key={o.id} style={{ marginTop: 10 }}><summary><a href={o.target_url} target="_blank" rel="noreferrer">{o.domain}</a> <span className="muted">{o.relevance_note}</span></summary><pre className="out">{o.draft_email}</pre></details>))}
      </div>

      <h2>Settings</h2>
      <SettingsForm site={site} />
      <p><ActionButton url={a("delete")} label="Delete this blog" confirm="Delete this blog and all its data? This cannot be undone." /></p>
    </>
  );
}
