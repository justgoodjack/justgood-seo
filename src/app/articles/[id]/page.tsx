import Link from "next/link";
import { db, must } from "@/lib/db";
import { StockControl } from "@/components/StockControl";
import { ActionButton } from "@/components/ActionButton";
import { ArticleEditor } from "@/components/ArticleEditor";
import type { Article } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = must(await db().from("articles").select("*").eq("id", id).single()) as Article;
  return (
    <>
      <p><Link href={`/sites/${a.site_id}`}>Back to blog</Link></p>
      <div className="row"><h1 style={{ margin: 0 }}>{a.kind === "refresh" ? "Refresh draft" : "Draft"}</h1><span className="pill">{a.status}</span></div>
      {a.notes && <p className="muted">Note: {a.notes}</p>}
      {a.status === "queued" ? <p className="card">Waiting for the generator. It runs nightly, or use Generate now on the blog page.</p> : <><div className="card"><div className="row" style={{ alignItems: "flex-start", gap: 16 }}>{a.featured_img_url ? <a href={a.featured_img_url} target="_blank" rel="noreferrer"><img src={a.featured_img_url} alt="Featured image preview" style={{ width: 280, maxWidth: "100%", borderRadius: 8, display: "block" }} /></a> : <div className="muted" style={{ width: 280, maxWidth: "100%", aspectRatio: "16 / 10", border: "1px dashed var(--line)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>No featured image yet</div>}<div><strong>Featured image</strong><p className="muted">Click the image to open it full size. Pick a source below; a new image replaces this one.</p><p className="row"><ActionButton url={`/api/articles/${a.id}/image`} body={{ mode: "ai" }} label={a.featured_img_url ? "Regenerate AI image" : "Generate AI image"} /></p><StockControl articleId={a.id} hasImage={!!a.featured_img_url} /><p className="row"></p></div></div></div><ArticleEditor a={a} /></>}
      {a.sources?.length > 0 && (<><h2>Grounding sources</h2><div className="card muted">{a.sources.map((s, i) => <div key={i}><a href={s.uri} target="_blank" rel="noreferrer">{s.title || s.uri}</a></div>)}</div></>)}
    </>
  );
}
