import Link from "next/link";
import { ActionButton } from "@/components/ActionButton";
import { getSite } from "@/lib/siteData";

export const dynamic = "force-dynamic";

export default async function SearchConsole({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = await getSite(id);
  return (
    <>
      <div className="pagehead">
        <div>
          <p className="eyebrow">Step 3 · Grow</p>
          <h2 className="ptitle">Search Console</h2>
          <p className="lede">Spot posts that are losing traffic. Compares the last 28 days with the 28 before and queues a rewrite for anything slipping. Rewrites appear under <Link href={`/sites/${id}/articles?status=pending_review`}>Articles</Link> for your approval.</p>
        </div>
      </div>
      {!site.gsc_property && <div className="callout">No Search Console property is connected. <Link href={`/sites/${id}/settings`}>Add it in Settings</Link>, and add your service account as a user in Search Console.</div>}
      <div className="card row between">
        <div><strong>Check now</strong><p className="muted" style={{ margin: "4px 0 0" }}>{site.gsc_property ? <>Connected to <span className="mono">{site.gsc_property}</span>. Also runs every night.</> : "Runs every night once connected."}</p></div>
        <ActionButton url={`/api/sites/${id}/gsc-sync`} label="Check for slipping posts" mark />
      </div>
    </>
  );
}
