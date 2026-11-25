"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, fmtDate } from "./Badge";
import { groupSimilar, type Strictness } from "@/lib/similarity";
import { MIN_PRIORITY } from "@/lib/priority";

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

const PRIORITY: { key: string; label: string; test: (n: number) => boolean }[] = [
  { key: "core", label: `Priority ${MIN_PRIORITY} to 10`, test: (n) => n >= MIN_PRIORITY },
  { key: "nine", label: "Priority 9 to 10", test: (n) => n >= 9 },
  { key: "ten", label: "Priority 10 only", test: (n) => n === 10 },
  { key: "all", label: "Show all, including lower", test: () => true },
];
const STATUS_LABEL: Record<string, string> = { new: "Unscheduled", scheduled: "Scheduled", drafted: "Drafted", published: "Published", skipped: "Skipped" };
const NONE = "__none__";

export function TopicsList({ siteId, rows }: { siteId: string; rows: TopicRow[] }) {
  const [q, setQ] = useState("");
  const [pri, setPri] = useState("core");
  const [intent, setIntent] = useState("");
  const [cluster, setCluster] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [simOpen, setSimOpen] = useState(false);
  const [level, setLevel] = useState<Strictness>("normal");
  const [rm, setRm] = useState<Set<string>>(new Set());
  const router = useRouter();

  const scopeRows = useMemo(() => rows.filter((r) => PRIORITY.find((p) => p.key === pri)!.test(r.priority)), [rows, pri]);
  const hiddenLow = rows.filter((r) => r.priority < MIN_PRIORITY).length;
  const groups = useMemo(() => groupSimilar(scopeRows, level), [scopeRows, level]);
  const removable = (r: TopicRow) => r.status === "new" || r.status === "scheduled" || r.status === "skipped"; // never offer topics that already have an article
  const dupeTotal = groups.reduce((n, g) => n + g.dupes.length, 0);
  useEffect(() => { setRm(new Set(groups.flatMap((g) => g.dupes.filter(removable).map((d) => d.id)))); }, [groups]);

  const intents = [...new Set(rows.map((r) => r.intent).filter(Boolean) as string[])].sort();
  const clusters = [...new Set(rows.map((r) => r.cluster).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b));
  const statuses = [...new Set(rows.map((r) => r.status))];
  const hasUnlabeledIntent = rows.some((r) => !r.intent), hasNoCluster = rows.some((r) => !r.cluster);

  const needle = q.trim().toLowerCase();
  const shown = rows.filter((r) =>
    (!needle || r.phrase.toLowerCase().includes(needle) || (r.cluster ?? "").toLowerCase().includes(needle)) &&
    PRIORITY.find((p) => p.key === pri)!.test(r.priority) &&
    (!intent || (intent === NONE ? !r.intent : r.intent === intent)) &&
    (!cluster || (cluster === NONE ? !r.cluster : r.cluster === cluster)) &&
    (!status || r.status === status));
  const filtering = !!(needle || pri !== "core" || intent || cluster || status);
  const reset = () => { setQ(""); setPri("core"); setIntent(""); setCluster(""); setStatus(""); };

  const shownIds = shown.map((r) => r.id);
  const { sel, toggle, all, toggleAll, clear } = useSelection(shownIds);
  const picked = shownIds.filter((id) => sel.has(id)); // never act on rows hidden by a filter
  const unschedIds = scopeRows.filter((r) => r.status === "new").map((r) => r.id);
  const unscheduled = unschedIds.length;

  async function del(body: unknown, ask: string) {
    if (!window.confirm(ask)) return;
    setBusy(true); setMsg("");
    try { const r = await call(siteId, "delete-topics", body); setMsg(`Deleted ${r.deleted} topic${r.deleted === 1 ? "" : "s"}`); clear(); router.refresh(); }
    catch (e) { setMsg("Couldn't delete: " + (e as Error).message); }
    setBusy(false);
  }

  return (
    <div className="card pad0">
      <div className="filters">
        <div className="searchbox">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search topics or clusters" aria-label="Search topics" />
        </div>
        <select value={pri} onChange={(e) => setPri(e.target.value)} aria-label="Filter by priority">{PRIORITY.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}</select>
        <select value={intent} onChange={(e) => setIntent(e.target.value)} aria-label="Filter by intent"><option value="">Any intent</option>{intents.map((i) => <option key={i} value={i}>{i[0].toUpperCase() + i.slice(1)}</option>)}{hasUnlabeledIntent && <option value={NONE}>No intent</option>}</select>
        <select value={cluster} onChange={(e) => setCluster(e.target.value)} aria-label="Filter by cluster"><option value="">Any cluster</option>{clusters.map((c) => <option key={c} value={c}>{c}</option>)}{hasNoCluster && <option value={NONE}>No cluster</option>}</select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"><option value="">Any status</option>{statuses.map((st) => <option key={st} value={st}>{STATUS_LABEL[st] ?? st}</option>)}</select>
      </div>
      {simOpen && (
        <div className="similar">
          <div className="row between" style={{ marginBottom: 10 }}>
            <div><strong>Similar topics</strong><p className="muted" style={{ margin: "2px 0 0" }}>We keep the best topic in each group (already written first, then highest priority). Tick the ones to remove.</p></div>
            <div className="row"><select value={level} onChange={(e) => setLevel(e.target.value as Strictness)} aria-label="How similar" style={{ width: "auto" }}><option value="strict">Strict: nearly identical</option><option value="normal">Normal</option><option value="loose">Loose: related wording</option></select><button className="sm" onClick={() => setSimOpen(false)}>Close</button></div>
          </div>
          {groups.length === 0 ? <p className="muted" style={{ margin: 0 }}>No similar topics found at this setting. Try Loose.</p> : (
            <>
              <div className="simgroups">
                {groups.map((g) => (
                  <div key={g.keeper.id} className="simgroup">
                    <div className="simrow keep"><span className="badge ok">Keep</span><span className="simname">{g.keeper.phrase}</span><span className="muted">priority {g.keeper.priority}</span><Badge status={g.keeper.status} /></div>
                    {g.dupes.map((d) => (
                      <label key={d.id} className={`simrow ${removable(d) ? "" : "locked"}`}>
                        <input type="checkbox" className="chk" disabled={!removable(d)} checked={rm.has(d.id)} onChange={() => setRm((x) => { const n = new Set(x); n.has(d.id) ? n.delete(d.id) : n.add(d.id); return n; })} />
                        <span className="simname">{d.phrase}</span><span className="muted">priority {d.priority}</span><Badge status={d.status} />
                        {!removable(d) && <span className="muted">already written</span>}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
              <div className="row" style={{ marginTop: 12 }}>
                <button className="danger" disabled={busy || rm.size === 0} onClick={() => del({ ids: [...rm] }, `Remove ${rm.size} similar topic${rm.size === 1 ? "" : "s"}? The best topic in each group is kept.`)}>Remove {rm.size} selected</button>
                <button className="sm" onClick={() => setRm(new Set(groups.flatMap((g) => g.dupes.filter(removable).map((d) => d.id))))}>Select all</button>
                <button className="sm" onClick={() => setRm(new Set())}>Select none</button>
                <span className="muted">{groups.length} groups, {dupeTotal} possible duplicates</span>
              </div>
            </>
          )}
        </div>
      )}
      <div className="listbar">
        {picked.length > 0
          ? <><strong>{picked.length} selected</strong><button className="sm danger" disabled={busy} onClick={() => del({ ids: picked }, `Delete ${picked.length} topic${picked.length === 1 ? "" : "s"}? Articles already written from them are kept.`)}>Delete selected</button><button className="sm" onClick={clear}>Clear</button></>
          : <>
              <span className="muted">{filtering ? <>Showing <strong>{shown.length}</strong> of {scopeRows.length} topics</> : <>{scopeRows.length} topics</>}</span>
              {filtering && <button className="sm" onClick={reset}>Clear filters</button>}
              <button className={`sm ${simOpen ? "blue" : ""}`} onClick={() => setSimOpen(!simOpen)}>{dupeTotal > 0 ? `Similar topics (${dupeTotal})` : "Similar topics"}</button>
              {!filtering && unscheduled > 0 && <button className="sm danger" disabled={busy} onClick={() => del({ ids: unschedIds }, `Delete the ${unscheduled} unscheduled topics shown?`)}>Delete all {unscheduled} unscheduled</button>}
              {filtering && shown.length > 0 && <button className="sm danger" disabled={busy} onClick={() => del({ ids: shownIds }, `Delete the ${shown.length} topics currently shown? Articles already written from them are kept.`)}>Delete these {shown.length}</button>}
            </>}
        {hiddenLow > 0 && pri === "core" && <button className="sm" style={{ marginLeft: "auto" }} onClick={() => setPri("all")}>{hiddenLow} lower-priority hidden. Show</button>}
        {msg && <span className="muted" style={{ marginLeft: hiddenLow > 0 && pri === "core" ? 0 : "auto" }}>{msg}</span>}
      </div>
      <div className="tablewrap"><table>
        <thead><tr><th style={{ width: 40 }}><input type="checkbox" className="chk" checked={all} onChange={toggleAll} aria-label="Select all shown" /></th><th>Topic</th><th>Cluster</th><th>Intent</th><th className="num">Priority</th><th>Status</th><th>Date</th><th></th></tr></thead>
        <tbody>
          {shown.map((k) => (
            <tr key={k.id}>
              <td><input type="checkbox" className="chk" checked={sel.has(k.id)} onChange={() => toggle(k.id)} aria-label={`Select ${k.phrase}`} /></td>
              <td style={{ fontWeight: 600 }}>{k.phrase}</td><td>{k.cluster}</td><td className="muted">{k.intent}</td>
              <td className="num">{k.priority}</td><td><Badge status={k.status} /></td><td style={{ whiteSpace: "nowrap" }}>{fmtDate(k.scheduled_date)}</td>
              <td className="num"><button className="sm danger" disabled={busy} onClick={() => del({ ids: [k.id] }, `Delete the topic "${k.phrase}"?`)}>Delete</button></td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={8} className="empty">No topics yet. Add seed topics in Settings, then run Find topics.</td></tr>}
          {rows.length > 0 && scopeRows.length === 0 && <tr><td colSpan={8} className="empty">No topics at priority {MIN_PRIORITY} or higher yet. Find more topics, or <button className="sm" onClick={() => setPri("all")}>show the {hiddenLow} lower-priority ones</button></td></tr>}
          {scopeRows.length > 0 && shown.length === 0 && <tr><td colSpan={8} className="empty">No topics match. <button className="sm" onClick={reset}>Clear filters</button></td></tr>}
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
