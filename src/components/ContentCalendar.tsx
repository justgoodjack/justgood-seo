"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export interface CalItem { id: string; kind: "article" | "topic"; date: string; label: string; status: string; href?: string }

const STATUS: Record<string, { cls: string; name: string }> = {
  pending_review: { cls: "attn", name: "Needs review" },
  approved: { cls: "blue", name: "Approved" },
  published: { cls: "ok", name: "Live" },
  failed: { cls: "bad", name: "Failed" },
  scheduled: { cls: "topic", name: "Topic, not written yet" },
  queued: { cls: "", name: "Queued" },
  rejected: { cls: "", name: "Rejected" },
};

const pad = (n: number) => String(n).padStart(2, "0");
const key = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ContentCalendar({ siteId, items, today, list, gapDates = [] }: { siteId: string; items: CalItem[]; today: string; list: ReactNode; gapDates?: string[] }) {
  const gaps = new Set(gapDates);
  const router = useRouter();
  const [err, setErr] = useState("");
  async function remove(it: CalItem) {
    if (!window.confirm(it.kind === "topic" ? `Delete the topic "${it.label}"?` : `Delete "${it.label}" from this tool?${it.status === "published" ? " The live post stays on your blog." : ""}`)) return;
    setErr("");
    const res = it.kind === "topic"
      ? await fetch(`/api/sites/${siteId}/delete-topics`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [it.id] }) })
      : await fetch(`/api/articles/${it.id}`, { method: "DELETE" });
    if (!res.ok) setErr("Couldn't delete that. Try again."); else router.refresh();
  }
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [y0, m0] = today.split("-").map(Number);
  const [ym, setYm] = useState({ y: y0, m: m0 - 1 });
  const [sel, setSel] = useState<string>(today);

  const byDay = new Map<string, CalItem[]>();
  for (const it of items) byDay.set(it.date, [...(byDay.get(it.date) ?? []), it]);

  const first = new Date(ym.y, ym.m, 1);
  const lead = first.getDay();
  const days = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const monthName = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const inMonth = items.filter((i) => i.date.startsWith(`${ym.y}-${pad(ym.m + 1)}`)).length;
  const move = (d: number) => setYm(({ y, m }) => { const n = new Date(y, m + d, 1); return { y: n.getFullYear(), m: n.getMonth() }; });
  const selItems = byDay.get(sel) ?? [];

  return (
    <div>
      <div className="row between" style={{ marginBottom: 12 }}>
        <div className="seg" role="tablist">
          <button role="tab" aria-selected={view === "calendar"} className={view === "calendar" ? "on" : ""} onClick={() => setView("calendar")}>Calendar</button>
          <button role="tab" aria-selected={view === "list"} className={view === "list" ? "on" : ""} onClick={() => setView("list")}>List</button>
        </div>
        {view === "calendar" && (
          <div className="row" style={{ gap: 6 }}>
            <button className="sm" onClick={() => move(-1)} aria-label="Previous month">←</button>
            <strong style={{ minWidth: 150, textAlign: "center", fontFamily: "var(--display)", fontSize: 18 }}>{monthName}</strong>
            <button className="sm" onClick={() => move(1)} aria-label="Next month">→</button>
            <button className="sm" onClick={() => { setYm({ y: y0, m: m0 - 1 }); setSel(today); }}>Today</button>
          </div>
        )}
      </div>

      {view === "list" ? list : (
        <>
          <div className="card pad0">
            <div className="cal">
              {DOW.map((d) => <div key={d} className="dow">{d}</div>)}
              {cells.map((d, i) => {
                if (!d) return <div key={i} className="cell blank" />;
                const k = key(ym.y, ym.m, d);
                const its = byDay.get(k) ?? [];
                return (
                  <button key={i} className={`cell ${k === sel ? "sel" : ""} ${k < today ? "past" : ""} ${gaps.has(k) ? "gap" : ""}`} onClick={() => setSel(k)} aria-label={`${k}, ${its.length} items`}>
                    <span className={`dn ${k === today ? "today" : ""}`}>{d}</span>
                    <span className="chips">
                      {its.slice(0, 2).map((it, j) => <span key={j} className={`chip ${STATUS[it.status]?.cls ?? ""}`}>{it.label}</span>)}
                      {gaps.has(k) && <span className="opentag">Open</span>}
                      {its.length > 2 && <span className="more">+{its.length - 2} more</span>}
                    </span>
                    <span className="dots">{gaps.has(k) && <i className="dot2 bad" />}{its.slice(0, 4).map((it, j) => <i key={j} className={`dot2 ${STATUS[it.status]?.cls ?? ""}`} />)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="legend">
            {["pending_review", "approved", "published", "scheduled", "failed"].map((s) => <span key={s}><i className={`dot2 ${STATUS[s].cls}`} />{STATUS[s].name}</span>)}
          </div>

          <div className="card" style={{ marginTop: 14 }}>
            <p className="railtitle">{new Date(sel + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
            {err && <p className="muted" style={{ color: "var(--bad)" }}>{err}</p>}
            {selItems.length === 0 ? <p className="muted" style={{ margin: 0 }}>{inMonth === 0 ? "Nothing is scheduled this month." : "Nothing scheduled for this day."}</p> : (
              <div style={{ display: "grid", gap: 8 }}>
                {selItems.map((it, i) => (
                  <div key={i} className="row between" style={{ gap: 12 }}>
                    <span style={{ fontWeight: 600 }}>{it.href ? <Link href={it.href}>{it.label}</Link> : it.label}</span>
                    <span className="row" style={{ gap: 8 }}>
                      <span className={`badge ${STATUS[it.status]?.cls === "topic" ? "blue" : STATUS[it.status]?.cls ?? ""}`}>{STATUS[it.status]?.name ?? it.status}</span>
                      <button className="sm danger" onClick={() => remove(it)}>Delete</button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
