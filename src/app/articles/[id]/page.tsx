import Link from "next/link";
import { db, must } from "@/lib/db";
import { ActionButton } from "@/components/ActionButton";
import { StockPicker } from "@/components/StockPicker";
import { ArticleEditor } from "@/components/ArticleEditor";
import { Badge } from "@/components/Badge";
import type { Article } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = must(await db().from("articles").select("*").eq("id", id).single()) as Article;
  const queued = a.status === "queued";
  return (
    <>
      <Link href={`/sites/${a.site_id}`} className="crumb">← Back to blog</Link>
      <div className="pagehead">
        <div>
          <p className="eyebrow">{a.kind === "refresh" ? "Refresh draft" : "Draft"}</p>
          <div className="row" style={{ gap: 14 }}><h1 style={{ fontSize: "clamp(26px,4vw,36px)" }}>{a.title || "Untitled"}</h1><Badge status={a.status} /></div>
          {a.notes && <p className="lede">Why this refresh: {a.notes}</p>}
        </div>
        {a.wp_link && <a className="btn" href={a.wp_link} target="_blank" rel="noreferrer">View live post ↗</a>}
      </div>

      {queued ? (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <h3>Waiting for the writer</h3>
          <p className="lede" style={{ margin: "8px auto 0" }}>This refresh is queued. It's written during the nightly run, or use "Write drafts" on the blog page.</p>
        </div>
      ) : (
        <div className="split">
          <div><ArticleEditor a={a} /></div>
          <aside className="rail">
            <div className="card">
              <p className="railtitle">Featured image</p>
              {a.featured_img_url ? <a href={a.featured_img_url} target="_blank" rel="noreferrer"><img className="hero-img" src={a.featured_img_url} alt="Featured image preview" /></a> : <div className="hero-empty">No featured image yet</div>}
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
