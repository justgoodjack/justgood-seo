"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, fmtDate } from "./Badge";

export interface TopicRow { id: string; phrase: string; cluster: string | null; intent: string | null; priority: number; status: string; scheduled_date: string | null }
export interface ArticleRow { id: string; title: string; status: string; publish_date: string | null; wp_link: string | null }

async function call(siteId: string, action: string, body: unknown) {
  const res = await fetch(`/api/sites/${siteId}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error ?? `Error ${res.status}`);
  return j as { deleted?: number };
}

function useSelection(ids: string[]) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const all = ids.length > 0 && ids.every((i) => sel.has(i));
  const toggleAll = () => setSel(all ? new Set() : new Set(ids));
  return { sel, toggle, all, toggleAll, clear: () => setSel(new Set()) };
}

export function TopicsList({ siteId, rows }: { siteId: string; rows: TopicRow[] }) {
  const { sel, toggle, all, toggleAll, clear } = useSelection(rows.map((r) => r.id));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const unscheduled = rows.filter((r) => r.status === "new").length;

  async function del(body: unknown, ask: string) {
    if (!window.confirm(ask)) return;
    setBusy(true); setMsg("");
    try { const r = await call(siteId, "delete-topics", body); setMsg(`Deleted ${r.deleted} topic${r.deleted === 1 ? "" : "s"}`); clear(); router.refresh(); }
    catch (e) { setMsg("Couldn't delete: " + (e as Error).message); }
    setBusy(false);
  }

  return (
    <div className="card pad0">
      <div className="listbar">
        {sel.size > 0
          ? <><strong>{sel.size} selected</strong><button className="sm danger" disabled={busy} onClick={() => del({ ids: [...sel] }, `Delete ${sel.size} topic${sel.size === 1 ? "" : "s"}? Articles already written from them are kept.`)}>Delete selected</button><button className="sm" onClick={clear}>Clear</button></>
          : <><span className="muted">Select topics to remove them.</span>{unscheduled > 0 && <button className="sm danger" disabled={busy} onClick={() => del({ scope: "unscheduled" }, `Delete all ${unscheduled} unscheduled topics?`)}>Delete all {unscheduled} unscheduled</button>}</>}
        {msg && <span className="muted" style={{ marginLeft: "auto" }}>{msg}</span>}
      </div>
      <div className="tablewrap"><table>
        <thead><tr><th style={{ width: 40 }}><input type="checkbox" className="chk" checked={all} onChange={toggleAll} aria-label="Select all" /></th><th>Topic</th><th>Cluster</th><th>Intent</th><th className="num">Priority</th><th>Status</th><th>Date</th><th></th></tr></thead>
        <tbody>
          {rows.map((k) => (
            <tr key={k.id}>
              <td><input type="checkbox" className="chk" checked={sel.has(k.id)} onChange={() => toggle(k.id)} aria-label={`Select ${k.phrase}`} /></td>
              <td style={{ fontWeight: 600 }}>{k.phrase}</td><td>{k.cluster}</td><td className="muted">{k.intent}</td>
              <td className="num">{k.priority}</td><td><Badge status={k.status} /></td><td style={{ whiteSpace: "nowrap" }}>{fmtDate(k.scheduled_date)}</td>
              <td className="num"><button className="sm danger" disabled={busy} onClick={() => del({ ids: [k.id] }, `Delete the topic "${k.phrase}"?`)}>Delete</button></td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={8} className="empty">No topics yet. Add seed topics in Settings, then run Find topics in Setup.</td></tr>}
        </tbody>
      </table></div>
    </div>
  );
}

export function ArticlesList({ siteId, rows }: { siteId: string; rows: ArticleRow[] }) {
  const { sel, toggle, all, toggleAll, clear } = useSelection(rows.map((r) => r.id));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();

  async function del(ids: string[], ask: string) {
    if (!window.confirm(ask)) return;
    setBusy(true); setMsg("");
    try { const r = await call(siteId, "delete-articles", { ids }); setMsg(`Deleted ${r.deleted} article${r.deleted === 1 ? "" : "s"}`); clear(); router.refresh(); }
    catch (e) { setMsg("Couldn't delete: " + (e as Error).message); }
    setBusy(false);
  }
  const liveNote = "Posts already live stay on your blog; open one to remove it from WordPress too.";

  return (
    <div className="card pad0">
      <div className="listbar">
        {sel.size > 0
          ? <><strong>{sel.size} selected</strong><button className="sm danger" disabled={busy} onClick={() => del([...sel], `Delete ${sel.size} article${sel.size === 1 ? "" : "s"} from this tool? ${liveNote} The topics go back to your topic list, unscheduled.`)}>Delete selected</button><button className="sm" onClick={clear}>Clear</button></>
          : <span className="muted">Select articles to remove them, or open one to edit, disapprove or delete it.</span>}
        {msg && <span className="muted" style={{ marginLeft: "auto" }}>{msg}</span>}
      </div>
      <div className="tablewrap"><table>
        <thead><tr><th style={{ width: 40 }}><input type="checkbox" className="chk" checked={all} onChange={toggleAll} aria-label="Select all" /></th><th>Title</th><th>Status</th><th>Date</th><th>Live</th><th></th></tr></thead>
        <tbody>
          {rows.map((x) => (
            <tr key={x.id}>
              <td><input type="checkbox" className="chk" checked={sel.has(x.id)} onChange={() => toggle(x.id)} aria-label={`Select ${x.title}`} /></td>
              <td><Link href={`/articles/${x.id}`}>{x.title || "(queued refresh)"}</Link></td>
              <td><Badge status={x.status} /></td>
              <td style={{ whiteSpace: "nowrap" }}>{fmtDate(x.publish_date)}</td>
              <td style={{ whiteSpace: "nowrap" }}>{x.wp_link ? <a href={x.wp_link} target="_blank" rel="noreferrer">View ↗</a> : <span className="muted">-</span>}</td>
              <td className="num"><button className="sm danger" disabled={busy} onClick={() => del([x.id], `Delete "${x.title || "this article"}" from this tool? ${x.status === "published" ? liveNote : ""}`)}>Delete</button></td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={6} className="empty">No articles yet. Open Setup below and write your first drafts.</td></tr>}
        </tbody>
      </table></div>
    </div>
  );
}
