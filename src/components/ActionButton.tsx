"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ActionButton({ url, label, body, primary, confirm: ask }: { url: string; label: string; body?: unknown; primary?: boolean; confirm?: string }) {
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<string | null>(null);
  const router = useRouter();
  async function run() {
    if (ask && !window.confirm(ask)) return;
    setBusy(true); setOut(null);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });
      const text = await res.text();
      let pretty = text;
      try { pretty = JSON.stringify(JSON.parse(text), null, 2); } catch {}
      setOut(res.ok ? pretty : `Error ${res.status}: ${pretty}`);
      router.refresh();
    } catch (e) { setOut(String(e)); }
    setBusy(false);
  }
  return (
    <span>
      <button className={primary ? "primary" : ""} onClick={run} disabled={busy}>{busy ? "Working..." : label}</button>
      {out && <pre className="out">{out}</pre>}
    </span>
  );
}
