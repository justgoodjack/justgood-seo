import Link from "next/link";
import type { ReactNode } from "react";
import { db, must } from "@/lib/db";
import { getSite } from "@/lib/siteData";
import { SiteNav } from "@/components/SiteNav";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = await getSite(id);
  const arts = must(await db().from("articles").select("status").eq("site_id", id)) as { status: string }[];
  const kws = must(await db().from("keywords").select("status").eq("site_id", id).eq("status", "scheduled")) as unknown[];
  const review = arts.filter((a) => a.status === "pending_review").length;

  return (
    <>
      <Link href="/" className="crumb">← All blogs</Link>
      <div className="sitehead">
        <h1>{site.name}</h1>
        <span className={`badge ${site.publish_mode === "autopilot" ? "dark" : "blue"}`}>{site.publish_mode === "autopilot" ? "Autopilot" : "Batch preview"}</span>
        <a href={site.wp_url} target="_blank" rel="noreferrer" className="mono" style={{ marginLeft: "auto" }}>{site.domain} ↗</a>
      </div>
      <div className="sitegrid">
        <SiteNav id={id} review={review} queued={kws.length} />
        <div className="sitemain">{children}</div>
      </div>
    </>
  );
}
