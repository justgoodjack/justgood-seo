import { db, must } from "@/lib/db";
import { ActionButton } from "@/components/ActionButton";

export const dynamic = "force-dynamic";

export default async function Outreach({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const outreach = must(await db().from("outreach_prospects").select("*").eq("site_id", id).order("created_at", { ascending: false }).limit(50)) as { id: string; target_url: string; domain: string; relevance_note: string; draft_email: string }[];
  return (
    <>
      <div className="pagehead">
        <div>
          <p className="eyebrow">Step 3 · Grow</p>
          <h2 className="ptitle">Outreach</h2>
          <p className="lede">Sites that might link to you, with a short pitch email drafted for each. Nothing is ever sent for you.</p>
        </div>
        <div className="row"><ActionButton url={`/api/sites/${id}/outreach`} label="Find sites to pitch" mark /></div>
      </div>
      <div className="card">
        {outreach.length === 0 && <p className="muted" style={{ margin: 0 }}>No prospects yet. Find some to get started.</p>}
        {outreach.map((o, i) => (
          <details key={o.id} style={{ marginTop: i ? 14 : 0, borderTop: i ? "1px solid var(--line-2)" : 0, paddingTop: i ? 12 : 0 }}>
            <summary style={{ cursor: "pointer" }}><a href={o.target_url} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>{o.domain}</a> <span className="muted">&nbsp;{o.relevance_note}</span></summary>
            <div className="email"><small>Draft email</small>{o.draft_email}</div>
          </details>
        ))}
      </div>
    </>
  );
}
