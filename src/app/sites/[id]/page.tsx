import Link from "next/link";
import { db, must } from "@/lib/db";
import { ActionButton } from "@/components/ActionButton";
import { SettingsForm } from "@/components/SettingsForm";
import { Badge, fmtDate } from "@/components/Badge";
import type { Article, Keyword, Site } from "@/lib/types";

export const dynamic = "force-dynamic";

const STEPS: { url: string; no: string; title: string; text: string; label: string; body?: unknown; primary?: boolean }[] = [
  { url: "test-wp", no: "1", title: "Test connection", text: "Confirm WordPress login and publishing rights.", label: "Run test" },
  { url: "sync-posts", no: "2", title: "Index posts", text: "Read your existing posts so new drafts can link to them.", label: "Index posts" },
  { url: "mine-keywords", no: "3", title: "Find topics", text: "Mine Google suggestions and rank them for your niche.", label: "Mine keywords" },
  { url: "build-calendar", no: "4", title: "Plan calendar", text: "Give the best topics a publish date for the month.", label: "Build calendar" },
  { url: "generate", no: "5", title: "Write drafts", text: "Write articles for topics due in the next 7 days.", label: "Write 3 drafts", body: { count: 3 }, primary: true },
];

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
  const count = (st: string) => articles.filter((x) => x.status === st).length;
  const queued = keywords.filter((k) => k.status === "scheduled").length;
  const nextUp = articles.filter((x) => x.status === "approved" && x.publish_date).map((x) => x.publish_date as string).sort()[0];

  return (
    <>
      <Link href="/" className="crumb">← All blogs</Link>
      <div className="pagehead">
        <div>
          <p className="eyebrow">{site.niche || "Blog"}</p>
          <div className="row" style={{ gap: 14 }}>
            <h1>{site.name}</h1>
            <span className={`badge ${site.publish_mode === "autopilot" ? "warn" : "ok"}`}>{site.publish_mode === "autopilot" ? "Autopilot" : "Batch preview"}</span>
          </div>
          <p className="lede"><a href={site.wp_url} target="_blank" rel="noreferrer" className="mono">{site.domain}</a>{nextUp && <> &nbsp;·&nbsp; next post goes live {fmtDate(nextUp)}</>}</p>
        </div>
      </div>

      <div className="strip rise">
        <div className={`stat ${review.length ? "hot" : ""}`}><div className="n">{review.length}</div><div className="l">To review</div></div>
        <div className="stat"><div className="n">{count("approved")}</div><div className="l">Approved</div></div>
        <div className="stat"><div className="n">{count("published")}</div><div className="l">Live</div></div>
        <div className="stat"><div className="n">{queued}</div><div className="l">Topics queued</div></div>
      </div>

      <nav className="subnav">
        <a href="#pipeline">Pipeline</a><a href="#review">Review</a><a href="#articles">Articles</a><a href="#keywords">Calendar</a>
        <a href="#search-console">Search Console</a><a href="#ai-visibility">AI visibility</a><a href="#outreach">Outreach</a><a href="#settings">Settings</a>
      </nav>

      <section className="section" id="pipeline">
        <div className="section-head"><h2>Pipeline</h2><span className="hint">First time here? Run these in order. {linkCount} existing posts indexed.</span></div>
        <div className="steps">
          {STEPS.map((s) => (
            <div key={s.no} className={`step ${s.primary ? "final" : ""}`}>
              <span className="no">{s.no}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
              <ActionButton url={a(s.url)} label={s.label} body={s.body} primary={s.primary} />
            </div>
          ))}
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <ActionButton url={a("publish-due")} label="Publish due articles now" confirm="Publish all approved articles dated today or earlier?" />
          <span className="muted">Approved articles also go live automatically on their date.</span>
        </div>
      </section>

      <section className="section" id="review">
        <div className="section-head"><h2>Needs your review</h2><span className="hint">{review.length} waiting</span></div>
        <div className="card pad0 tablewrap">
          <table><thead><tr><th>Title</th><th>Type</th><th>Goes live</th><th></th></tr></thead><tbody>
            {review.map((x) => (
              <tr key={x.id}>
                <td><Link href={`/articles/${x.id}`}>{x.title || "(untitled)"}</Link></td>
                <td><span className="badge">{x.kind === "refresh" ? "Refresh" : "New"}</span></td>
                <td>{fmtDate(x.publish_date)}</td>
                <td className="num"><Link href={`/articles/${x.id}`} className="btn sm primary" style={{ color: "var(--accent-ink)" }}>Review</Link></td>
              </tr>
            ))}
            {review.length === 0 && <tr><td colSpan={4} className="empty">All caught up. Nothing is waiting for review.</td></tr>}
          </tbody></table>
        </div>
      </section>

      <section className="section" id="articles">
        <div className="section-head"><h2>All articles</h2><span className="hint">{articles.length} total</span></div>
        <div className="card pad0 tablewrap">
          <table><thead><tr><th>Title</th><th>Status</th><th>Date</th><th>Live</th></tr></thead><tbody>
            {articles.map((x) => (
              <tr key={x.id}>
                <td><Link href={`/articles/${x.id}`}>{x.title || "(queued refresh)"}</Link></td>
                <td><Badge status={x.status} /></td>
                <td>{fmtDate(x.publish_date)}</td>
                <td>{x.wp_link ? <a href={x.wp_link} target="_blank" rel="noreferrer">View ↗</a> : <span className="muted">-</span>}</td>
              </tr>
            ))}
            {articles.length === 0 && <tr><td colSpan={4} className="empty">No articles yet. Run step 5 above.</td></tr>}
          </tbody></table>
        </div>
      </section>

      <section className="section" id="keywords">
        <div className="section-head"><h2>Keyword calendar</h2><span className="hint">{keywords.length} topics</span></div>
        <div className="card pad0 tablewrap">
          <table><thead><tr><th>Keyword</th><th>Cluster</th><th>Intent</th><th className="num">Priority</th><th>Status</th><th>Date</th></tr></thead><tbody>
            {keywords.map((k) => (
              <tr key={k.id}>
                <td style={{ fontWeight: 600 }}>{k.phrase}</td><td>{k.cluster}</td><td className="muted">{k.intent}</td>
                <td className="num">{k.priority}</td><td><Badge status={k.status} /></td><td>{fmtDate(k.scheduled_date)}</td>
              </tr>
            ))}
            {keywords.length === 0 && <tr><td colSpan={6} className="empty">No keywords yet. Add seed topics in Settings, then run step 3.</td></tr>}
          </tbody></table>
        </div>
      </section>

      <section className="section" id="search-console">
        <div className="section-head"><h2>Search Console</h2></div>
        <div className="card row between">
          <div><strong>Spot decaying posts</strong><p className="muted" style={{ margin: "4px 0 0" }}>Compares the last 28 days with the 28 before, and queues rewrites for posts that are slipping. Needs a Search Console property in Settings.</p></div>
          <ActionButton url={a("gsc-sync")} label="Sync and queue refreshes" />
        </div>
      </section>

      <section className="section" id="ai-visibility">
        <div className="section-head"><h2>AI visibility</h2><span className="hint">Are AI assistants citing you?</span></div>
        <div className="card pad0">
          <div className="row" style={{ padding: "14px 18px", borderBottom: "1px solid var(--line-2)" }}>
            <ActionButton url={a("seed-geo")} label="Suggest tracking prompts" />
            <ActionButton url={a("geo-run")} label="Run checks now" />
          </div>
          <div className="tablewrap"><table><tbody>
            {geo.map((g) => (<tr key={g.id}><td>{g.target_prompt}</td><td><span className={`badge ${g.cited_bool ? "ok" : "bad"}`}>{g.cited_bool ? "Cited" : "Not cited"}</span></td><td className="muted num">{fmtDate(g.checked_at.slice(0, 10))}</td></tr>))}
            {geo.length === 0 && <tr><td className="empty">No checks yet. Suggest prompts, then run the checks.</td></tr>}
          </tbody></table></div>
        </div>
      </section>

      <section className="section" id="outreach">
        <div className="section-head"><h2>Outreach prospects</h2><span className="hint">You send these yourself</span></div>
        <div className="card">
          <ActionButton url={a("outreach")} label="Find prospects" />
          {outreach.map((o) => (
            <details key={o.id} style={{ marginTop: 14, borderTop: "1px solid var(--line-2)", paddingTop: 12 }}>
              <summary style={{ cursor: "pointer" }}><a href={o.target_url} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>{o.domain}</a> <span className="muted">&nbsp;{o.relevance_note}</span></summary>
              <pre className="out">{o.draft_email}</pre>
            </details>
          ))}
        </div>
      </section>

      <section className="section" id="settings">
        <details className="fold">
          <summary>Settings</summary>
          <div className="body">
            <SettingsForm site={site} />
            <div className="card flat row between" style={{ borderColor: "var(--bad)" }}>
              <div><strong>Delete this blog</strong><p className="muted" style={{ margin: "4px 0 0" }}>Removes its drafts, keywords and history from this tool. Your WordPress site is not touched.</p></div>
              <ActionButton url={a("delete")} label="Delete blog" danger confirm="Delete this blog and all its data? This cannot be undone." />
            </div>
          </div>
        </details>
      </section>
    </>
  );
}
