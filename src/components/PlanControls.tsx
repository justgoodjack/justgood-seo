"use client";
import { useState } from "react";
import { ActionButton } from "./ActionButton";

const RHYTHMS = [
  { perMonth: 30, label: "Every day" },
  { perMonth: 15, label: "Every other day" },
  { perMonth: 8, label: "Twice a week" },
  { perMonth: 4, label: "Once a week" },
];

const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export function PlanControls({ siteId, cadence }: { siteId: string; cadence: number }) {
  const [perMonth, setPerMonth] = useState(RHYTHMS.some((r) => r.perMonth === cadence) ? cadence : 30);
  return (
    <div className="row">
      <ActionButton url={`/api/sites/${siteId}/rebalance-calendar`} label="Spread clusters apart" />
      <select value={perMonth} onChange={(e) => setPerMonth(Number(e.target.value))} aria-label="Posting rhythm" style={{ width: "auto" }}>
        {RHYTHMS.map((r) => <option key={r.perMonth} value={r.perMonth}>{r.label}</option>)}
      </select>
      <ActionButton url={`/api/sites/${siteId}/build-calendar`} label="Plan next 30 days" mark body={() => ({ cadence: perMonth, today: localToday() })} />
    </div>
  );
}
