import { db, must } from "@/lib/db";
import { ActionButton } from "@/components/ActionButton";
import { fmtDate } from "@/components/Badge";

export const dynamic = "force-dynamic";

export default async function AiVisibility({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const geo = must(await db().from("geo_checks").select("*").eq("site_id", id).order("checked_at", { ascending: false }).limit(50)) as { id: string; target_prompt: string; cited_bool: boolean; checked_at: string }[];
  const cited = geo.filter((g) => g.cited_bool).length;
  return (
    <>
      <div className="pagehead">
        <div>
          <p className="eyebrow">Step 3 · Grow</p>
          <h2 className="ptitle">AI visibility</h2>
          <p className="lede">Questions people ask AI assistants, and whether your site is cited in the answer. Checked weekly.</p>
        </div>
        <div className="row">
          <ActionButton url={`/api/sites/${id}/seed-geo`} label="Suggest questions to track" />
          <ActionButton url={`/api/sites/${id}/geo-run`} label="Check now" mark />
        </div>
      </div>
      {geo.length > 0 && <p className="muted" style={{ marginTop: -8, marginBottom: 14 }}>Cited in {cited} of the last {geo.length} checks.</p>}
      <div className="card pad0 tablewrap"><table>
        <thead><tr><th>Question</th><th>Result</th><th className="num">Checked</th></tr></thead>
        <tbody>
          {geo.map((g) => (<tr key={g.id}><td>{g.target_prompt}</td><td><span className={`badge ${g.cited_bool ? "ok" : "bad"}`}>{g.cited_bool ? "Cited" : "Not cited"}</span></td><td className="muted num">{fmtDate(g.checked_at.slice(0, 10))}</td></tr>))}
          {geo.length === 0 && <tr><td colSpan={3} className="empty">No checks yet. Suggest some questions, then run a check.</td></tr>}
        </tbody>
      </table></div>
    </>
  );
}
