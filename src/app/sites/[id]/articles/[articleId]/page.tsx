import Link from "next/link";
import { notFound } from "next/navigation";
import { db, must } from "@/lib/db";
import { FeaturedCard } from "@/components/FeaturedCard";
import { ArticleEditor } from "@/components/ArticleEditor";
import { Badge, fmtDate } from "@/components/Badge";
import type { Article } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ArticlePage({ params, searchParams }: { params: Promise<{ id: string; articleId: string }>; searchParams: Promise<{ notice?: string }> }) {
  const { id, articleId } = await params;
  const { notice } = await searchParams;
  const a = (await db().from("articles").select("*").eq("id", articleId).eq("site_id", id).maybeSingle()).data as Article | null;
  if (!a) notFound();

  const queue = must(await db().from("articles").select("id,title,publish_date").eq("site_id", id).eq("status", "pending_review").order("publish_date", { ascending: true, nullsFirst: false }).order("created_at")) as { id: string; title: string; publish_date: string | null }[];
  const idx = queue.findIndex((x) => x.id === a.id);
  const prev = idx > 0 ? queue[idx - 1] : null;
  const next = idx >= 0 ? queue[idx + 1] ?? null : queue[0] ?? null;
  const base = `/sites/${id}/articles`;
  const queueHref = `${base}?status=pending_review`;
  // After approving or rejecting: on to the next draft waiting, else the one before it, else the queue page.
  const after = queue.filter((x) => x.id !== a.id);
  const nextAfter = idx >= 0 ? after[idx] ?? after[idx - 1] ?? null : after[0] ?? null;
  const nextHref = nextAfter ? `${base}/${nextAfter.id}` : queueHref;
  const queued = a.status === "queued";

  return (
    <>
      <div className="articlebar">
        <div className="row" style={{ gap: 10 }}>
          <Link href={queueHref} className="btn sm">← Needs review{queue.length ? ` (${queue.length})` : ""}</Link>
          <Link href={base} className="crumb" style={{ margin: 0 }}>All articles</Link>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <Badge status={a.status} />
          {a.publish_date && <span className="muted">Goes live {fmtDate(a.publish_date)}</span>}
          {idx >= 0 && <span className="muted">Draft {idx + 1} of {queue.length}</span>}
          {idx >= 0 && <>
            {prev ? <Link href={`${base}/${prev.id}`} className="btn sm" title={prev.title}>← Previous</Link> : <span className="btn sm disabled">← Previous</span>}
            {next ? <Link href={`${base}/${next.id}`} className="btn sm" title={next.title}>Next →</Link> : <span className="btn sm disabled">Next →</span>}
          </>}
          {a.wp_link && <a className="btn sm" href={a.wp_link} target="_blank" rel="noreferrer">View live post ↗</a>}
        </div>
      </div>

      {notice && (
        <div className="callout ok" role="status">
          <span>{notice}</span>
          <Link href={`${base}/${a.id}`} className="muted" style={{ marginLeft: "auto" }}>Dismiss</Link>
        </div>
      )}
      {a.notes && <p className="lede" style={{ marginTop: 0, marginBottom: 18 }}>{a.status === "failed" ? "What went wrong: " : a.status === "published" ? "Note: " : "Why this refresh: "}{a.notes}</p>}

      {queued ? (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <h2>{a.title || "Queued refresh"}</h2>
          <p className="lede" style={{ margin: "10px auto 0" }}>Waiting for the writer. It runs overnight, or use Write drafts on the Articles page.</p>
        </div>
      ) : (
        <>
          <FeaturedCard articleId={a.id} title={a.title} url={a.featured_img_url} />
          <ArticleEditor a={a} siteId={id} queueHref={queueHref} listHref={base} nextHref={nextHref} queueCount={queue.length} />
          {a.sources?.length > 0 && (
            <details className="card" style={{ marginTop: 16 }}>
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>Research sources ({a.sources.length})</summary>
              <div style={{ display: "grid", gap: 6, fontSize: 14, marginTop: 10 }}>{a.sources.slice(0, 12).map((s, i) => <a key={i} href={s.uri} target="_blank" rel="noreferrer" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title || s.uri}</a>)}</div>
            </details>
          )}
        </>
      )}
    </>
  );
}
