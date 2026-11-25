"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Article } from "@/lib/types";

const TOOLS: ({ label: string; cmd: string; val?: string; title: string } | "sep")[] = [
  { label: "B", cmd: "bold", title: "Bold" },
  { label: "I", cmd: "italic", title: "Italic" },
  "sep",
  { label: "Heading", cmd: "formatBlock", val: "h2", title: "Section heading" },
  { label: "Subheading", cmd: "formatBlock", val: "h3", title: "Subheading" },
  { label: "Text", cmd: "formatBlock", val: "p", title: "Normal paragraph" },
  "sep",
  { label: "• List", cmd: "insertUnorderedList", title: "Bullet list" },
  { label: "1. List", cmd: "insertOrderedList", title: "Numbered list" },
  { label: "Quote", cmd: "formatBlock", val: "blockquote", title: "Pull quote" },
  "sep",
  { label: "Undo", cmd: "undo", title: "Undo" },
  { label: "Redo", cmd: "redo", title: "Redo" },
];

export function ArticleEditor({ a }: { a: Article }) {
  const [t, setT] = useState(a.title);
  const [slug, setSlug] = useState(a.slug);
  const [meta, setMeta] = useState(a.meta_desc);
  const [html, setHtml] = useState(a.html_body);
  const [date, setDate] = useState(a.publish_date ?? "");
  const [msg, setMsg] = useState("");
  const [liveLink, setLiveLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [adv, setAdv] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const locked = a.status === "published" && a.kind === "new";

  useEffect(() => { if (body.current) body.current.innerHTML = a.html_body; }, [a.html_body]);

  const run = (cmd: string, val?: string) => {
    body.current?.focus();
    document.execCommand(cmd, false, val);
    if (body.current) setHtml(body.current.innerHTML);
  };
  const link = () => {
    const url = window.prompt("Link to which address?", "https://");
    if (url) run("createLink", url);
  };

  async function patch(extra: Record<string, unknown> = {}) {
    setBusy(true);
    const res = await fetch(`/api/articles/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: t, slug, meta_desc: meta, html_body: html, publish_date: date || null, ...extra }) });
    setMsg(res.ok ? "Saved" : "Couldn't save. Try again.");
    setBusy(false); router.refresh();
    return res.ok;
  }
  async function remove() {
    const live = a.status === "published" && !!a.wp_post_id;
    if (!window.confirm(live ? "Delete this article from the tool?" : "Delete this article? This can't be undone. Its topic goes back to your topic list, unscheduled.")) return;
    let wp = false;
    if (live) wp = window.confirm("This post is live on your blog.\n\nOK = also move it to the WordPress trash (it disappears from your site)\nCancel = leave it live on your blog");
    setBusy(true);
    const res = await fetch(`/api/articles/${a.id}${wp ? "?wp=1" : ""}`, { method: "DELETE" });
    if (res.ok) { router.push(`/sites/${a.site_id}/articles`); router.refresh(); return; }
    const j = await res.json().catch(() => ({}));
    setMsg("Couldn't delete: " + (j.error ?? res.status));
    setBusy(false);
  }
  async function publishNow() {
    if (!window.confirm("Publish this to WordPress right now?")) return;
    if (!(await patch())) return;
    setBusy(true);
    const res = await fetch(`/api/articles/${a.id}/publish`, { method: "POST" });
    const j = await res.json();
    setMsg(res.ok ? "Published and confirmed live on WordPress." : "Couldn't publish: " + j.error);
    if (res.ok) setLiveLink(j.link);
    setBusy(false); router.refresh();
  }

  return (
    <div>
      <div className="paper"><div className="inner">
        {a.featured_img_url && <img className="cover" src={a.featured_img_url} alt="" />}
        <textarea className="headline" rows={2} value={t} onChange={(e) => setT(e.target.value)} aria-label="Article title" placeholder="Title" />
        <div className="toolbar" role="toolbar" aria-label="Formatting">
          {TOOLS.map((x, i) => x === "sep" ? <span key={i} className="sep" /> : (
            <button key={x.label} className="sm" title={x.title} onMouseDown={(e) => e.preventDefault()} onClick={() => run(x.cmd, x.val)} style={x.label === "B" ? { fontWeight: 800 } : x.label === "I" ? { fontStyle: "italic" } : undefined}>{x.label}</button>
          ))}
          <button className="sm" title="Add a link" onMouseDown={(e) => e.preventDefault()} onClick={link}>Link</button>
        </div>
        <div ref={body} className="body-edit" contentEditable suppressContentEditableWarning onInput={() => body.current && setHtml(body.current.innerHTML)} aria-label="Article body" />
      </div></div>

      <div className="card formcard" style={{ marginTop: 16 }}>
        <p className="railtitle">Publishing details</p>
        <div className="grid2">
          <div><label>Goes live on</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><label>Web address ending</label><input value={slug} onChange={(e) => setSlug(e.target.value)} /></div>
        </div>
        <label>Google snippet <span style={{ color: meta.length > 160 ? "var(--bad)" : "var(--ink-3)", textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>({meta.length}/155 characters)</span></label>
        <input value={meta} onChange={(e) => setMeta(e.target.value)} />
        <div className="email" style={{ marginTop: 12, background: "#fff", color: "#17202c" }}>
          <small>How it may look in Google</small>
          <div style={{ color: "#1a0dab", fontSize: 18, fontFamily: "var(--sans)" }}>{t || "Title"}</div>
          <div style={{ color: "#4d5156", fontFamily: "var(--sans)", fontSize: 14, whiteSpace: "normal" }}>{meta || "Your snippet appears here."}</div>
        </div>
        <details style={{ marginTop: 14 }} open={adv} onToggle={(e) => setAdv((e.target as HTMLDetailsElement).open)}>
          <summary className="muted" style={{ cursor: "pointer" }}>Advanced: edit the raw HTML</summary>
          <textarea className="codearea" style={{ marginTop: 10 }} value={html} onChange={(e) => { setHtml(e.target.value); if (body.current) body.current.innerHTML = e.target.value; }} />
        </details>
      </div>

      <div className="actionbar">
        <button disabled={busy} onClick={() => patch()}>Save</button>
        {a.status !== "approved" && a.status !== "published" && <button className="green" disabled={busy} onClick={async () => { if (await patch({ status: "approved" })) setMsg(date && date > new Date().toISOString().slice(0, 10) ? `Approved. It will publish automatically on ${new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })}. Use Publish now to send it immediately.` : "Approved. It publishes at the next nightly run, or use Publish now."); }}>Approve{date ? ` for ${new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}</button>}
        {a.status === "approved" && <button className="mark" disabled={busy} onClick={() => patch({ status: "pending_review" })}>Disapprove</button>}
        {a.status === "rejected" && <button disabled={busy} onClick={() => patch({ status: "pending_review" })}>Restore to review</button>}
        {a.status !== "published" && a.status !== "rejected" && <button className="danger" disabled={busy} onClick={() => patch({ status: "rejected" })}>Reject</button>}
        {!locked && <button className="blue" disabled={busy} onClick={publishNow}>{a.kind === "refresh" ? "Update live post now" : "Publish now"}</button>}
        <button className="danger" disabled={busy} onClick={remove} style={{ marginLeft: "auto" }}>Delete</button>
        <span className="muted">{msg}{liveLink && <> <a href={liveLink} target="_blank" rel="noreferrer">View it live ↗</a></>}</span>
      </div>
    </div>
  );
}
