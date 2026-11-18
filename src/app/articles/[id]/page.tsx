import Link from "next/link";
import { db, must } from "@/lib/db";
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
      {a.status === "queued" ? <p className="card">Waiting for the generator. It runs nightly, or use Generate now on the blog page.</p> : <><p className="row"><ActionButton url={`/api/articles/${a.id}/image`} label={a.featured_img_url ? "Regenerate featured image" : "Add featured image"} /></p><ArticleEditor a={a} /></>}
      {a.sources?.length > 0 && (<><h2>Grounding sources</h2><div className="card muted">{a.sources.map((s, i) => <div key={i}><a href={s.uri} target="_blank" rel="noreferrer">{s.title || s.uri}</a></div>)}</div></>)}
    </>
  );
}
