"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Article } from "@/lib/types";
import { PhotoDialog, type Picked } from "./PhotoDialog";

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

export function ArticleEditor({ a, siteId, queueHref, listHref, nextHref, queueCount }: { a: Article; siteId: string; queueHref: string; listHref: string; nextHref: string; queueCount: number }) {
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
  const savedRange = useRef<Range | null>(null);
  const [dlg, setDlg] = useState<null | { mode: "replace"; index: number } | { mode: "insert" }>(null);
  // Built after the page loads: the server cannot parse the article HTML, so doing it during render would not match.
  const [photos, setPhotos] = useState<{ src: string; alt: string }[]>([]);
  useEffect(() => {
    setPhotos([...new DOMParser().parseFromString(html, "text/html").querySelectorAll("img")].map((i) => ({ src: i.getAttribute("src") ?? "", alt: i.getAttribute("alt") ?? "" })));
  }, [html]);
  const router = useRouter();
  // What was last saved, so we can warn before leaving with unsaved changes.
  const saved = useRef({ t: a.title, slug: a.slug, meta: a.meta_desc, html: a.html_body, date: a.publish_date ?? "" });
  const dirty = t !== saved.current.t || slug !== saved.current.slug || meta !== saved.current.meta || html !== saved.current.html || date !== saved.current.date;
  useEffect(() => {
    if (!dirty) return;
    const unload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    // In-app links (sidebar, top bar, back links) do not reload the page, so catch those clicks too.
    const click = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest("a");
      const href = el?.getAttribute("href");
      if (!el || !href || href.startsWith("#") || el.target === "_blank" || e.defaultPrevented) return;
      if (!window.confirm("You have unsaved changes. Leave without saving?")) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", click, true); };
  }, [dirty]);
  const go = (href: string, notice: string) => router.push(`${href}${href.includes("?") ? "&" : "?"}notice=${encodeURIComponent(notice)}`);
  const short = (x: string) => (x.length > 60 ? x.slice(0, 57) + "..." : x);
  const isLive = a.status === "published";

  useEffect(() => { if (body.current) body.current.innerHTML = a.html_body; }, [a.html_body]);

  const run = (cmd: string, val?: string) => {
    body.current?.focus();
    document.execCommand(cmd, false, val);
    if (body.current) setHtml(body.current.innerHTML);
  };
  const sync = () => body.current && setHtml(body.current.innerHTML);
  const imgAt = (i: number) => body.current?.querySelectorAll("img")[i] as HTMLImageElement | undefined;
  const replacePhoto = (i: number, p: Picked) => {
    const img = imgAt(i); if (!img) return;
    img.src = p.url; img.alt = p.alt; ["srcset", "sizes", "width", "height"].forEach((x) => img.removeAttribute(x));
    sync(); setMsg("Photo changed. Press Save to keep it.");
  };
  const removePhoto = (i: number) => {
    const img = imgAt(i); if (!img) return;
    if (!window.confirm("Remove this photo from the article?")) return;
    (img.closest("figure") ?? img).remove(); sync(); setMsg("Photo removed. Press Save to keep it.");
  };
  const insertPhoto = (p: Picked) => {
    const fig = document.createElement("figure"); fig.className = "wp-block-image";
    const im = document.createElement("img"); im.src = p.url; im.alt = p.alt; im.loading = "lazy"; fig.appendChild(im);
    const root = body.current; if (!root) return;
    const r = savedRange.current;
    if (r && root.contains(r.commonAncestorContainer) && r.commonAncestorContainer !== root) {
      let node: Node = r.startContainer; while (node.parentNode && node.parentNode !== root) node = node.parentNode;
      (node as ChildNode).after(fig);
    } else root.appendChild(fig);
    sync(); setMsg("Photo added. Press Save to keep it.");
  };
  const rememberCaret = () => { const sel = window.getSelection(); savedRange.current = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null; };
  const link = () => {
    const url = window.prompt("Link to which address?", "https://");
    if (url) run("createLink", url);
  };

  async function patch(extra: Record<string, unknown> = {}) {
    setBusy(true);
    const res = await fetch(`/api/articles/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: t, slug, meta_desc: meta, html_body: html, publish_date: date || null, ...extra }) });
    if (res.ok) saved.current = { t, slug, meta, html, date };
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
    if (res.ok) { saved.current = { t, slug, meta, html, date }; go(queueCount > 0 ? queueHref : listHref, `Deleted "${short(t)}".`); return; }
    const j = await res.json().catch(() => ({}));
    setMsg("Couldn't delete: " + (j.error ?? res.status));
    setBusy(false);
  }
  async function publishNow() {
    if (!window.confirm(isLive ? "Update the live post on WordPress with these changes?" : "Publish this to WordPress right now?")) return;
    if (!(await patch())) return;
    setBusy(true);
    const res = await fetch(`/api/articles/${a.id}/publish`, { method: "POST" });
    const j = await res.json();
    setMsg(res.ok ? (isLive && !j.dropped?.length ? "Live post updated and confirmed on WordPress." : j.dropped?.length ? `Published and confirmed live. A WordPress plugin crashed on: ${j.dropped.join("; ")}.` : "Published and confirmed live on WordPress.") : "Couldn't publish: " + j.error);
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
          <button className="sm" title="Add a photo at your cursor" onMouseDown={(e) => { e.preventDefault(); rememberCaret(); }} onClick={() => setDlg({ mode: "insert" })}>Photo</button>
          <button className="sm" title="Add a link" onMouseDown={(e) => e.preventDefault()} onClick={link}>Link</button>
        </div>
        <div ref={body} className="body-edit" contentEditable suppressContentEditableWarning onInput={() => body.current && setHtml(body.current.innerHTML)} onDoubleClick={(e) => { const t = e.target as HTMLElement; if (t.tagName === "IMG") setDlg({ mode: "replace", index: [...(body.current?.querySelectorAll("img") ?? [])].indexOf(t as HTMLImageElement) }); }} aria-label="Article body" />
        <p className="muted" style={{ margin: "14px 0 0" }}>Tip: double-click any photo to change it.</p>
      </div></div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <p className="railtitle" style={{ margin: 0 }}>Photos in this article</p>
          <button className="sm" onClick={() => { savedRange.current = null; setDlg({ mode: "insert" }); }}>Add a photo</button>
        </div>
        {photos.length === 0 ? <p className="muted" style={{ margin: 0 }}>No photos inside the article yet.</p> : (
          <div className="phototiles">
            {photos.map((ph, i) => (
              <div key={i} className="phototile">
                <img src={ph.src} alt={ph.alt} />
                <div className="muted" style={{ fontSize: 12, minHeight: 32 }}>{ph.alt || "No description"}</div>
                <div className="row" style={{ gap: 6 }}><button className="sm primary" onClick={() => setDlg({ mode: "replace", index: i })}>Change</button><button className="sm danger" onClick={() => removePhoto(i)}>Remove</button></div>
              </div>
            ))}
          </div>
        )}
      </div>

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

      {dlg && <PhotoDialog articleId={a.id} target="body" title={t} alt={dlg.mode === "replace" ? photos[dlg.index]?.alt : ""} onClose={() => setDlg(null)} onPick={(p) => { if (dlg.mode === "replace") replacePhoto(dlg.index, p); else insertPhoto(p); setDlg(null); }} />}

      <div className="actionbar">
        <Link href={queueHref} className="btn">← Review queue{queueCount ? ` (${queueCount})` : ""}</Link>
        <button disabled={busy} onClick={() => patch()}>{dirty ? "Save changes" : "Saved"}</button>
        {a.status !== "approved" && a.status !== "published" && <button className="green" disabled={busy} onClick={async () => { if (await patch({ status: "approved" })) go(nextHref, `Approved "${short(t)}"${date ? ` for ${new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })}` : ""}. ${date && date > new Date().toISOString().slice(0, 10) ? "It publishes automatically on that day." : "It publishes at the next nightly run, or use Publish now."}`); }}>Approve{date ? ` for ${new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}</button>}
        {a.status === "approved" && <button className="mark" disabled={busy} onClick={() => patch({ status: "pending_review" })}>Disapprove</button>}
        {a.status === "rejected" && <button disabled={busy} onClick={() => patch({ status: "pending_review" })}>Restore to review</button>}
        {a.status !== "published" && a.status !== "rejected" && <button className="danger" disabled={busy} onClick={async () => { if (await patch({ status: "rejected" })) go(nextHref, `Rejected "${short(t)}". It is out of the review queue.`); }}>Reject</button>}
        <button className="blue" disabled={busy} onClick={publishNow}>{isLive || a.kind === "refresh" ? "Update live post" : "Publish now"}</button>
        <button className="danger" disabled={busy} onClick={remove} style={{ marginLeft: "auto" }}>Delete</button>
        <span className="muted">{msg}{liveLink && <> <a href={liveLink} target="_blank" rel="noreferrer">View it live ↗</a></>}</span>
      </div>
    </div>
  );
}
