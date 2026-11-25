"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Summary { title: string; lines: string[] }

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

/** Turn API results into plain sentences. No JSON, ever. */
function describe(action: string, d: Record<string, unknown>): Summary {
  const num = (k: string) => Number(d[k] ?? 0);
  switch (action) {
    case "test-wp": {
      const cats = (d.categories as unknown[] | undefined)?.length ?? 0;
      return { title: `Connected as ${d.user}`, lines: [
        d.canPublish ? "This account can publish posts" : "This account cannot publish posts. Check its WordPress role.",
        d.canUnfilteredHtml ? "FAQ schema and rich content will be kept" : "WordPress may strip FAQ schema from posts",
        `${plural(cats, "category")} found on the site`,
      ] };
    }
    case "test-post":
      return { title: "A test draft was created in WordPress", lines: [`Look for "SEO Engine test draft" under Posts, Drafts in your WordPress admin (post number ${d.id})`, "You can delete it from there. Nothing was published."] };
    case "sync-posts":
      return { title: `Indexed ${plural(num("indexedNow"), "post")}`, lines: [`${plural(num("totalOnSite"), "published post")} on your site`, ...(num("remaining") > 0 ? [`${num("remaining")} more to go. Run this again to continue.`] : ["Everything is indexed"])] };
    case "mine-keywords":
      return { title: `Added ${plural(num("added"), "new topic")}`, lines: [`Looked through ${num("candidates")} Google suggestions`, "Find them in the Calendar section below"] };
    case "build-calendar":
      return num("scheduled") ? { title: `Scheduled ${plural(num("scheduled"), "topic")}`, lines: [`The first one goes out ${d.firstDate}`] } : { title: "Nothing to schedule", lines: ["Mine keywords first, then build the calendar."] };
    case "generate":
    case "publish-due": {
      const rows = (d.results as string[] | undefined) ?? [];
      if (!rows.length) return { title: action === "generate" ? "Nothing is due to be written yet" : "Nothing is due to publish", lines: action === "generate" ? ["Topics need a date within the next 7 days. Build the calendar first."] : [] };
      const lines = rows.map((r) => {
        const [kind, , ...rest] = r.split(":");
        const text = rest.join(":");
        return kind === "ERROR" ? `Problem: ${text}` : kind === "published" ? `Published ${text}` : kind === "refresh" ? "Rewrote a slipping post" : `Wrote a draft: ${text}`;
      });
      const bad = rows.filter((r) => r.startsWith("ERROR")).length;
      return { title: bad && bad === rows.length ? "That didn't work" : action === "generate" ? `Finished ${plural(rows.length - bad, "draft")}` : `Published ${plural(rows.length - bad, "article")}`, lines };
    }
    case "gsc-sync":
      return { title: `Checked ${plural(num("pages"), "page")}`, lines: [`${plural(num("candidates"), "post")} look like they're slipping`, `${plural(num("queued"), "rewrite")} queued for review`] };
    case "seed-geo": return { title: `Added ${plural(num("prompts"), "question")} to track`, lines: ["They'll be checked weekly"] };
    case "geo-run": return { title: `Checked ${plural(num("checked"), "question")}`, lines: [`${num("cited")} cited your site`] };
    case "outreach": return num("added") ? { title: `Found ${plural(num("added"), "prospect")}`, lines: ["Review the drafts below"] } : { title: "No new prospects right now", lines: [String(d.skipped ?? "Try again in a few days")] };
    case "image": return { title: d.source === "stock" ? "Stock photo added" : "New image added", lines: ["It's now the featured image"] };
    case "update": return { title: "Saved", lines: [] };
    case "delete": return { title: "Deleted", lines: [] };
    default: return { title: "Done", lines: Object.entries(d).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`) };
  }
}

export function ActionButton({ url, label, body, primary, danger, mark, confirm: ask, reload }: { url: string; label: string; body?: unknown; primary?: boolean; danger?: boolean; mark?: boolean; confirm?: string; reload?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<{ ok: boolean; s: Summary } | null>(null);
  const router = useRouter();
  const action = url.split("/").pop() ?? "";

  async function run() {
    if (ask && !window.confirm(ask)) return;
    setBusy(true); setOut(null);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });
      const text = await res.text();
      let data: Record<string, unknown> = {};
      try { data = JSON.parse(text); } catch { /* html error page */ }
      if (!res.ok) {
        const msg = typeof data.error === "string" ? data.error : res.status === 404 ? "This feature isn't available yet. Wait a minute for the latest update to finish deploying, then try again." : `The server returned an error (${res.status}).`;
        setOut({ ok: false, s: { title: "That didn't work", lines: [msg.slice(0, 400)] } });
      } else {
        const s = describe(action, data);
        const failed = Array.isArray(data.results) && (data.results as string[]).length > 0 && (data.results as string[]).every((r) => r.startsWith("ERROR"));
        setOut({ ok: !failed, s });
        if (reload) setTimeout(() => window.location.reload(), 1200); else router.refresh();
      }
    } catch (e) { setOut({ ok: false, s: { title: "Couldn't reach the server", lines: [String(e)] } }); }
    setBusy(false);
  }
  return (
    <span style={{ display: "contents" }}>
      <button className={`${primary ? "primary" : ""} ${mark ? "mark" : ""} ${danger ? "danger" : ""} ${busy ? "btn-spin" : ""}`} onClick={run} disabled={busy}>{busy ? "Working" : label}</button>
      {out && (
        <div className={`result ${out.ok ? "ok" : "err"}`} style={{ flexBasis: "100%" }}>
          <strong>{out.s.title}</strong>
          {out.s.lines.length > 0 && <ul>{out.s.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>}
        </div>
      )}
    </span>
  );
}
