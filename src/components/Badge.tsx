const MAP: Record<string, { label: string; cls: string }> = {
  pending_review: { label: "Needs review", cls: "signal" },
  approved: { label: "Approved", cls: "warn" },
  published: { label: "Live", cls: "ok" },
  rejected: { label: "Rejected", cls: "" },
  failed: { label: "Failed", cls: "bad" },
  queued: { label: "Queued", cls: "" },
  scheduled: { label: "Scheduled", cls: "warn" },
  drafted: { label: "Drafted", cls: "signal" },
  new: { label: "Unscheduled", cls: "" },
  skipped: { label: "Skipped", cls: "" },
};

export function Badge({ status, label }: { status: string; label?: string }) {
  const m = MAP[status] ?? { label: status, cls: "" };
  return <span className={`badge ${m.cls}`}>{label ?? m.label}</span>;
}

export const fmtDate = (d?: string | null) =>
  d ? new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
