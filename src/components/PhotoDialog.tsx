"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Cand { stockId: string; thumb: string; full: string; credit: string }
export interface Picked { url: string; id: number; alt: string }

/** Change one photo: search stock, generate with AI, or upload your own. */
export function PhotoDialog({ articleId, target, title, alt, onPick, onClose }: {
  articleId: string; target: "featured" | "body"; title: string; alt?: string;
  onPick: (p: Picked) => void; onClose: () => void;
}) {
  const [tab, setTab] = useState<"stock" | "ai" | "upload">("stock");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  // stock
  const [q, setQ] = useState(alt && alt.length < 80 ? alt : "");
  const [cands, setCands] = useState<Cand[]>([]);
  const [queries, setQueries] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  // ai
  const [prompt, setPrompt] = useState(alt ?? "");
  const [made, setMade] = useState<{ url: string; id: number } | null>(null);
  // upload
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  const ref = useRef<HTMLDialogElement>(null);
  const [place, setPlace] = useState<{ top: number; maxH: number } | null>(null);

  // A native modal <dialog> is drawn by the browser in its own top layer, always centered on the screen,
  // no matter what animation, transform or layout the page behind it has.
  useEffect(() => {
    const d = ref.current;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (d && !d.open) d.showModal();
    return () => { document.body.style.overflow = prev; if (d?.open) d.close(); };
  }, []);

  // Some tools show a site inside a pane that is as tall as the whole page and scrolls the outside instead.
  // There, "the screen" is the entire article, so centre on the part you can actually see.
  useEffect(() => {
    const embedded = window.innerHeight > (window.screen.availHeight || window.screen.height) + 40;
    if (!embedded || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      const r = entries[entries.length - 1].intersectionRect;
      if (r.height > 120) setPlace({ top: r.top + r.height / 2, maxH: Math.max(240, r.height - 32) });
    }, { threshold: Array.from({ length: 101 }, (_, i) => i / 100) });
    io.observe(document.body);
    return () => io.disconnect();
  }, []);

  useEffect(() => { if (!file) { setPreview(""); return; } const u = URL.createObjectURL(file); setPreview(u); return () => URL.revokeObjectURL(u); }, [file]);

  const api = async (path: string, init: RequestInit) => {
    const res = await fetch(`/api/articles/${articleId}/${path}`, init);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error ?? `Error ${res.status}`);
    return j;
  };
  const run = async (f: () => Promise<void>) => { setBusy(true); setMsg(""); try { await f(); } catch (e) { setMsg((e as Error).message); } setBusy(false); };

  const search = (more: boolean) => run(async () => {
    const next = more ? page + 1 : 1;
    const j = await api("stock-search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: more ? undefined : q, queries: more ? queries : undefined, page: next, exclude: more ? cands.map((c) => c.stockId) : [] }) });
    setQueries(j.queries); setPage(next); setCands(more ? [...cands, ...j.candidates] : j.candidates);
    if (!j.candidates.length) setMsg(more ? "No more photos for this search." : "Nothing found. Try different words.");
  });
  const pickStock = (c: Cand) => run(async () => {
    const j = await api("stock-pick", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ full: c.full, credit: c.credit, target }) });
    onPick({ url: j.url, id: j.id, alt: q.trim() || alt || title });
  });
  const generate = () => run(async () => {
    setMade(null);
    const j = await api("image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "ai", target: "body-preview", prompt: prompt.trim() }) });
    setMade({ url: j.url, id: j.id });
  });
  const upload = () => run(async () => {
    if (!file) return;
    const j = await api(`upload?target=${target === "body" ? "body" : "featured"}`, { method: "POST", headers: { "Content-Type": file.type }, body: file });
    onPick({ url: j.url, id: j.id, alt: alt || title });
  });
  // AI results are uploaded to WordPress but only applied when the user accepts them
  const useMade = () => run(async () => {
    if (!made) return;
    if (target === "featured") {
      const res = await fetch(`/api/articles/${articleId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ featured_img_url: made.url, featured_media_id: made.id }) });
      if (!res.ok) throw new Error("Couldn't save the new photo. Try again.");
    }
    onPick({ url: made.url, id: made.id, alt: prompt.trim() || alt || title });
  });

  // Rendered straight into <body> so no animated or transformed ancestor can displace it down the page.
  if (typeof document === "undefined") return null;
  return createPortal(
    <dialog
      ref={ref}
      className="modal"
      aria-label="Change photo"
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={place ? { top: place.top, bottom: "auto", margin: "0 auto", transform: "translateY(-50%)", maxHeight: place.maxH } : undefined}
    >
      <div className="modalbody">
        <div className="row between" style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 22 }}>{target === "featured" ? "Change the featured photo" : "Change this photo"}</h2>
          <button className="sm" onClick={onClose}>Close</button>
        </div>
        <div className="seg" role="tablist" style={{ marginBottom: 14 }}>
          {([["stock", "Stock photos"], ["ai", "Generate with AI"], ["upload", "Upload your own"]] as const).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => { setTab(k); setMsg(""); }}>{l}</button>
          ))}
        </div>

        {tab === "stock" && (
          <div>
            <div className="row" style={{ flexWrap: "nowrap" }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search(false)} placeholder="Describe the photo, e.g. community volunteers (blank lets the AI choose)" />
              <button className="primary" disabled={busy} onClick={() => search(false)}>{busy ? "Searching" : "Search"}</button>
            </div>
            {queries.length > 0 && <p className="muted" style={{ margin: "8px 0 0" }}>Searched: {queries.join(" / ")}</p>}
            {cands.length > 0 && (
              <>
                <div className="thumbs big">{cands.map((c) => <button key={c.stockId} className="thumb" title={`${c.credit}. Click to use`} disabled={busy} onClick={() => pickStock(c)}><img src={c.thumb} alt={c.credit} /></button>)}</div>
                <div className="row"><button className="sm" disabled={busy} onClick={() => search(true)}>Show more</button><span className="muted">Click a photo to use it.</span></div>
              </>
            )}
          </div>
        )}

        {tab === "ai" && (
          <div>
            <label style={{ marginTop: 0 }}>What should the photo show?</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. volunteers planting a tree in a sunny park (leave blank and the AI decides from your article)" style={{ minHeight: 80 }} />
            <p className="muted" style={{ margin: "6px 0 12px" }}>Describe a scene. Photos with signs or writing in them tend to come out garbled, so the AI is told to avoid text.</p>
            <div className="row"><button className="primary" disabled={busy} onClick={generate}>{busy ? "Generating" : made ? "Try another" : "Generate photo"}</button></div>
            {made && (
              <div style={{ marginTop: 14 }}>
                <img src={made.url} alt="Generated preview" style={{ width: "100%", maxWidth: 420, borderRadius: 10, border: "1px solid var(--line)", display: "block" }} />
                <div className="row" style={{ marginTop: 10 }}><button className="green" disabled={busy} onClick={useMade}>Use this photo</button></div>
              </div>
            )}
          </div>
        )}

        {tab === "upload" && (
          <div>
            <label style={{ marginTop: 0 }}>Choose a photo from your computer</label>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <p className="muted" style={{ margin: "6px 0 12px" }}>JPG, PNG, WebP or GIF, up to 4 MB.</p>
            {preview && <img src={preview} alt="Your photo" style={{ width: "100%", maxWidth: 420, borderRadius: 10, border: "1px solid var(--line)", display: "block", marginBottom: 12 }} />}
            <button className="primary" disabled={busy || !file} onClick={upload}>{busy ? "Uploading" : "Use this photo"}</button>
          </div>
        )}
        {msg && <p className="result err" style={{ marginTop: 14 }}>{msg}</p>}
      </div>
    </dialog>,
    document.body,
  );
}
