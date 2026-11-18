"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Article } from "@/lib/types";

export function ArticleEditor({ a }: { a: Article }) {
  const [t, setT] = useState(a.title);
  const [slug, setSlug] = useState(a.slug);
  const [meta, setMeta] = useState(a.meta_desc);
  const [html, setHtml] = useState(a.html_body);
  const [date, setDate] = useState(a.publish_date ?? "");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const locked = a.status === "published" && a.kind === "new";

  async function patch(extra: Record<string, unknown> = {}) {
    setBusy(true);
    const res = await fetch(`/api/articles/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: t, slug, meta_desc: meta, html_body: html, publish_date: date || null, ...extra }) });
    setMsg(res.ok ? "Saved" : "Error: " + (await res.text()));
    setBusy(false); router.refresh();
    return res.ok;
  }
  async function publishNow() {
    if (!window.confirm("Publish this to WordPress right now?")) return;
    if (!(await patch())) return;
    setBusy(true);
    const res = await fetch(`/api/articles/${a.id}/publish`, { method: "POST" });
    const j = await res.json();
    setMsg(res.ok ? `Published: ${j.link}` : "Error: " + j.error);
    setBusy(false); router.refresh();
  }

  return (
    <div>
      <div className="card">
        <label>Title</label><input value={t} onChange={(e) => setT(e.target.value)} />
        <div className="grid2">
          <div><label>Slug</label><input value={slug} onChange={(e) => setSlug(e.target.value)} /></div>
          <div><label>Publish date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        </div>
        <label>Meta description ({meta.length}/155)</label><input value={meta} onChange={(e) => setMeta(e.target.value)} />
        <label>Body HTML</label><textarea style={{ minHeight: 320, fontFamily: "monospace", fontSize: 13 }} value={html} onChange={(e) => setHtml(e.target.value)} />
        <p className="row">
          <button disabled={busy} onClick={() => patch()}>Save</button>
          {a.status !== "approved" && a.status !== "published" && <button className="primary" disabled={busy} onClick={() => patch({ status: "approved" })}>Approve (publishes on {date || "its date"})</button>}
          {a.status === "approved" && <button disabled={busy} onClick={() => patch({ status: "pending_review" })}>Move back to review</button>}
          {a.status !== "published" && <button disabled={busy} onClick={() => patch({ status: "rejected" })}>Reject</button>}
          {!locked && <button disabled={busy} onClick={publishNow}>{a.kind === "refresh" ? "Update live post now" : "Publish now"}</button>}
          <span className="muted">{msg}</span>
        </p>
      </div>
      <h2>Preview</h2>
      <div className="preview">{a.featured_img_url && <img src={a.featured_img_url} alt="" />}<h1>{t}</h1><div dangerouslySetInnerHTML={{ __html: html }} /></div>
    </div>
  );
}
