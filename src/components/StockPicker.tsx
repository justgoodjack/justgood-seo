"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Cand { stockId: string; thumb: string; full: string; credit: string }

export function StockPicker({ articleId }: { articleId: string }) {
  const [q, setQ] = useState("");
  const [cands, setCands] = useState<Cand[]>([]);
  const [queries, setQueries] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState<Cand | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();

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
    setMsg(res.ok ? "Featured image updated" : j.error ?? "Failed");
    if (res.ok) { setCands([]); setSel(null); router.refresh(); }
    setBusy(false);
  }

  return (
    <div style={{ width: "100%" }}>
      <label>Stock photos: search yourself, or leave blank and the AI chooses the search</label>
      <div className="row">
        <input style={{ flex: 1, minWidth: 200 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. community volunteers, protest crowd" onKeyDown={(e) => e.key === "Enter" && search(false)} />
        <button disabled={busy} onClick={() => search(false)}>{busy ? "Working..." : "Find stock photos"}</button>
      </div>
      {queries.length > 0 && <p className="muted">Searched: {queries.join(" / ")}</p>}
      {cands.length > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8, margin: "8px 0" }}>
            {cands.map((c) => (
              <button key={c.stockId} onClick={() => setSel(c)} title={c.credit} style={{ padding: 0, overflow: "hidden", borderWidth: 3, borderColor: sel?.stockId === c.stockId ? "var(--accent)" : "var(--line)" }}>
                <img src={c.thumb} alt={c.credit} style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }} />
              </button>
            ))}
          </div>
          <div className="row">
            <button className="primary" disabled={!sel || busy} onClick={use}>{sel ? "Use selected photo" : "Click a photo to select it"}</button>
            <button disabled={busy} onClick={() => search(true)}>Show more</button>
          </div>
        </>
      )}
      {msg && <p className="muted">{msg}</p>}
    </div>
  );
}
