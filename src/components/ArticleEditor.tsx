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
  const [showCode, setShowCode] = useState(false);
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
      <div className="card formcard">
        <label>Title</label>
        <input className="titleinput" value={t} onChange={(e) => setT(e.target.value)} />
        <div className="grid2">
          <div><label>URL slug</label><input value={slug} onChange={(e) => setSlug(e.target.value)} /></div>
          <div><label>Goes live on</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        </div>
        <label>Meta description <span style={{ color: meta.length > 160 ? "var(--bad)" : "var(--ink-3)", textTransform: "none", letterSpacing: 0 }}>({meta.length}/155)</span></label>
        <input value={meta} onChange={(e) => setMeta(e.target.value)} />
        <div className="row between" style={{ marginTop: 16 }}>
          <label style={{ margin: 0 }}>Article HTML</label>
          <button className="sm" onClick={() => setShowCode(!showCode)}>{showCode ? "Hide code" : "Edit HTML"}</button>
        </div>
        {showCode && <textarea className="codearea" style={{ marginTop: 8 }} value={html} onChange={(e) => setHtml(e.target.value)} />}
      </div>

      <div className="actionbar">
        <button disabled={busy} onClick={() => patch()}>Save</button>
        {a.status !== "approved" && a.status !== "published" && <button className="primary" disabled={busy} onClick={() => patch({ status: "approved" })}>Approve{date ? ` for ${new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}</button>}
        {a.status === "approved" && <button disabled={busy} onClick={() => patch({ status: "pending_review" })}>Back to review</button>}
        {a.status !== "published" && <button className="danger" disabled={busy} onClick={() => patch({ status: "rejected" })}>Reject</button>}
        {!locked && <button disabled={busy} onClick={publishNow}>{a.kind === "refresh" ? "Update live post now" : "Publish now"}</button>}
        <span className="muted" style={{ marginLeft: "auto" }}>{msg}</span>
      </div>

      <section className="section" style={{ marginTop: 36 }}>
        <div className="section-head"><h2>Reader preview</h2><span className="hint">How it will read on your blog</span></div>
        <div className="reader"><div className="inner">
          {a.featured_img_url && <img className="cover" src={a.featured_img_url} alt="" />}
          <h1>{t}</h1>
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div></div>
      </section>
    </div>
  );
}
