import Link from "next/link";
import { db, must } from "@/lib/db";
import { ActionButton } from "@/components/ActionButton";
import { TopicsList } from "@/components/Lists";
import { getSite } from "@/lib/siteData";
import type { Keyword } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Topics({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = await getSite(id);
  const keywords = must(await db().from("keywords").select("*").eq("site_id", id).order("priority", { ascending: false }).order("trend_score", { ascending: false }).limit(300)) as Keyword[];
  return (
    <>
      <div className="pagehead">
        <div>
          <p className="eyebrow">Step 1 · Plan</p>
          <h2 className="ptitle">Topics</h2>
          <p className="lede">Ideas for articles, mined from Google suggestions and ranked for your niche. Only priority 8 to 10 is shown and scheduled. Delete the ones you don't want, then give the rest dates on the <Link href={`/sites/${id}/calendar`}>Calendar</Link>.</p>
        </div>
        <div className="row"><ActionButton url={`/api/sites/${id}/mine-keywords`} label="Find more topics" mark /></div>
      </div>
      {site.seed_topics.length === 0 && <div className="callout">No seed topics yet. <Link href={`/sites/${id}/settings`}>Add a few in Settings</Link> so the search knows where to look.</div>}
      {site.seed_topics.length > 0 && <p className="muted" style={{ marginTop: -8, marginBottom: 14 }}>Searching from: {site.seed_topics.join(", ")}. <Link href={`/sites/${id}/settings`}>Change</Link></p>}
      <TopicsList siteId={id} rows={keywords.map((k) => ({ id: k.id, phrase: k.phrase, cluster: k.cluster, intent: k.intent, priority: k.priority, status: k.status, scheduled_date: k.scheduled_date }))} />
    </>
  );
}
