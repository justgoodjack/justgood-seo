import Link from "next/link";
import { db, must } from "@/lib/db";
import { ActionButton } from "@/components/ActionButton";
import { StockPicker } from "@/components/StockPicker";
import { ArticleEditor } from "@/components/ArticleEditor";
import { Badge, fmtDate } from "@/components/Badge";
import type { Article } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = must(await db().from("articles").select("*").eq("id", id).single()) as Article;
  const queued = a.status === "queued";
  return (
    <>
      <Link href={`/sites/${a.site_id}`} className="crumb">← Back to blog</Link>
      <div className="row" style={{ marginBottom: 22, gap: 12 }}>
        <p className="eyebrow" style={{ margin: 0 }}>{a.kind === "refresh" ? "Refresh" : "Draft"}</p>
        <Badge status={a.status} />
        {a.publish_date && <span className="muted">Goes live {fmtDate(a.publish_date)}</span>}
        {a.wp_link && <a className="btn sm" href={a.wp_link} target="_blank" rel="noreferrer" style={{ marginLeft: "auto" }}>View live post ↗</a>}
      </div>
      {a.notes && <p className="lede" style={{ marginTop: 0, marginBottom: 22 }}>Why this refresh: {a.notes}</p>}

      {queued ? (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <h2>{a.title || "Queued refresh"}</h2>
          <p className="lede" style={{ margin: "10px auto 0" }}>Waiting for the writer. It runs overnight, or use Write drafts in Setup on the blog page.</p>
        </div>
      ) : (
        <div className="split">
          <div><ArticleEditor a={a} /></div>
          <aside className="rail">
            <div className="card">
              <p className="railtitle">Featured image</p>
              {a.featured_img_url ? <a href={a.featured_img_url} target="_blank" rel="noreferrer"><img className="hero-img" src={a.featured_img_url} alt="Featured image" /></a> : <div className="hero-empty">No image yet</div>}
              <div className="row" style={{ marginTop: 12 }}>
                <ActionButton url={`/api/articles/${a.id}/image`} body={{ mode: "ai" }} reload label={a.featured_img_url ? "Regenerate with AI" : "Generate with AI"} />
              </div>
            </div>
            <div className="card"><p className="railtitle">Stock photos</p><StockPicker articleId={a.id} /></div>
            {a.sources?.length > 0 && (
              <div className="card">
                <p className="railtitle">Research sources</p>
                <div style={{ display: "grid", gap: 6, fontSize: 13 }}>{a.sources.slice(0, 8).map((s, i) => <a key={i} href={s.uri} target="_blank" rel="noreferrer" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title || s.uri}</a>)}</div>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
