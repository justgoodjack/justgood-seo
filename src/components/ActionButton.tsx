"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ActionButton({ url, label, body, primary, danger, confirm: ask, reload }: { url: string; label: string; body?: unknown; primary?: boolean; danger?: boolean; confirm?: string; reload?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();
  async function run() {
    if (ask && !window.confirm(ask)) return;
    setBusy(true); setOut(null);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });
      const text = await res.text();
      let pretty = text;
      try { pretty = JSON.stringify(JSON.parse(text), null, 2); } catch {}
      setOut({ ok: res.ok, text: res.ok ? pretty : `Error ${res.status}\n${pretty.slice(0, 600)}` });
      if (res.ok && reload) setTimeout(() => window.location.reload(), 1200); else router.refresh();
    } catch (e) { setOut({ ok: false, text: String(e) }); }
    setBusy(false);
  }
  return (
    <span style={{ display: "contents" }}>
      <button className={`${primary ? "primary" : ""} ${danger ? "danger" : ""} ${busy ? "btn-spin" : ""}`} onClick={run} disabled={busy}>{busy ? "Working" : label}</button>
      {out && <pre className={`result ${out.ok ? "ok" : "err"}`} style={{ flexBasis: "100%" }}>{out.text}</pre>}
    </span>
  );
}
