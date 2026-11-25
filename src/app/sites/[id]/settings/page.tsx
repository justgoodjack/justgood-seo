import { db } from "@/lib/db";
import { ActionButton } from "@/components/ActionButton";
import { SettingsForm } from "@/components/SettingsForm";
import { getSite } from "@/lib/siteData";

export const dynamic = "force-dynamic";

export default async function Settings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = await getSite(id);
  const linkCount = (await db().from("internal_link_index").select("id", { count: "exact", head: true }).eq("site_id", id)).count ?? 0;
  const a = (x: string) => `/api/sites/${id}/${x}`;
  return (
    <>
      <div className="pagehead"><div><p className="eyebrow">Blog</p><h2 className="ptitle">Settings</h2><p className="lede">Connection, voice, and publishing preferences.</p></div></div>

      <h3 className="subh">Connection checks</h3>
      <div className="card pad0">
        <div className="step"><span className="no">1</span><div><h3>Test the connection</h3><p>Confirm the WordPress login works and can publish.</p></div><span className="act"><ActionButton url={a("test-wp")} label="Run test" /></span></div>
        <div className="step"><span className="no">2</span><div><h3>Send a test draft</h3><p>Creates one clearly labelled draft in WordPress (not published) to prove articles can reach your site.</p></div><span className="act"><ActionButton url={a("test-post")} label="Send test draft" /></span></div>
        <div className="step"><span className="no">3</span><div><h3>Index existing posts</h3><p>Read your current posts so new drafts can link to them. {linkCount} indexed so far.</p></div><span className="act"><ActionButton url={a("sync-posts")} label="Index posts" /></span></div>
      </div>

      <h3 className="subh">Blog settings</h3>
      <SettingsForm site={site} />

      <h3 className="subh">Danger zone</h3>
      <div className="card flat row between" style={{ borderColor: "var(--bad)" }}>
        <div><strong>Delete this blog</strong><p className="muted" style={{ margin: "4px 0 0" }}>Removes its drafts, topics and history from this tool. Your WordPress site is not touched.</p></div>
        <ActionButton url={a("delete")} label="Delete blog" danger confirm="Delete this blog and all its data? This cannot be undone." />
      </div>
    </>
  );
}
