"use client";
import { useState } from "react";

interface Cand { stockId: string; thumb: string; full: string; credit: string }

export function StockPicker({ articleId }: { articleId: string }) {
  const [q, setQ] = useState("");
  const [cands, setCands] = useState<Cand[]>([]);
  const [queries, setQueries] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState<Cand | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [applied, setApplied] = useState("");

  async function search(more: boolean) {
    setBusy(true); setMsg("");
    const nextPage = more ? page + 1 : 1;
    const res = await fetch(`/api/articles/${articleId}/stock-search`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: more ? undefined : q, queries: more ? queries : undefined, page: nextPage, exclude: more ? cands.map((c) => c.stockId) : [] }),
    });
    const j = await res.json();
    if (!res.ok) { setMsg(j.error ?? "Search failed"); setBusy(false); return; }
    setQueries(j.queries); setPage(nextPage);
    setCands(more ? [...cands, ...j.candidates] : j.candidates);
    if (!j.candidates.length) setMsg(more ? "No more photos for these searches. Try typing your own." : "Nothing found. Try typing a different search.");
    if (!more) setSel(null);
    setBusy(false);
  }

  async function use() {
    if (!sel) return;
    setBusy(true); setMsg("");
    const res = await fetch(`/api/articles/${articleId}/stock-pick`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ full: sel.full, credit: sel.credit }) });
    const j = await res.json();
    if (!res.ok) { setMsg("Error: " + (j.error ?? "Failed")); setBusy(false); return; }
    setApplied(j.url);
    setMsg("Saved to WordPress as the featured image. Reloading the page...");
    setCands([]); setSel(null);
    setTimeout(() => window.location.reload(), 1200);
    setBusy(false);
  }

  return (
    <div style={{ width: "100%" }}>
      <label style={{ marginTop: 0 }}>Search (blank lets the AI choose)</label>
      <div style={{ display: "grid", gap: 8 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. community volunteers, protest crowd" onKeyDown={(e) => e.key === "Enter" && search(false)} />
        <button disabled={busy} className={busy ? "btn-spin" : ""} onClick={() => search(false)}>{busy ? "Searching" : "Find stock photos"}</button>
      </div>
      {queries.length > 0 && <p className="muted">Searched: {queries.join(" / ")}</p>}
      {cands.length > 0 && (
        <>
          <div className="thumbs">
            {cands.map((c) => (
              <button key={c.stockId} onClick={() => setSel(c)} title={c.credit} className={`thumb ${sel?.stockId === c.stockId ? "sel" : ""}`}>
                <img src={c.thumb} alt={c.credit} />
              </button>
            ))}
          </div>
          <div className="row">
            <button className="primary sm" disabled={!sel || busy} onClick={use}>{sel ? "Use this photo" : "Pick a photo"}</button>
            <button className="sm" disabled={busy} onClick={() => search(true)}>Show more</button>
          </div>
        </>
      )}
      {applied && <p><img src={applied} alt="New featured image" style={{ width: 200, borderRadius: 8, display: "block" }} /></p>}
      {msg && <p className="muted" style={msg.startsWith("Error") ? { color: "var(--warn)" } : undefined}>{msg}</p>}
    </div>
  );
}
