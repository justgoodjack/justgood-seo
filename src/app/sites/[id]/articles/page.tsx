import Link from "next/link";
import { db, must } from "@/lib/db";
import { ActionButton } from "@/components/ActionButton";
import { ArticlesList } from "@/components/Lists";
import type { Article } from "@/lib/types";

export const dynamic = "force-dynamic";

const TABS: { key: string; label: string; match?: string[] }[] = [
  { key: "all", label: "All" },
  { key: "pending_review", label: "Needs review", match: ["pending_review"] },
  { key: "approved", label: "Approved", match: ["approved"] },
  { key: "published", label: "Live", match: ["published"] },
  { key: "other", label: "Other", match: ["queued", "failed", "rejected"] },
];

export default async function Articles({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ status?: string }> }) {
  const { id } = await params;
  const { status = "all" } = await searchParams;
  const articles = must(await db().from("articles").select("*").eq("site_id", id).order("publish_date", { ascending: false, nullsFirst: true }).limit(300)) as Article[];
  const tab = TABS.find((t) => t.key === status) ?? TABS[0];
  const shown = tab.match ? articles.filter((a) => tab.match!.includes(a.status)) : articles;
  const n = (t: (typeof TABS)[number]) => (t.match ? articles.filter((a) => t.match!.includes(a.status)).length : articles.length);
  return (
    <>
      <div className="pagehead">
        <div>
          <p className="eyebrow">Step 2 · Create</p>
          <h2 className="ptitle">Articles</h2>
          <p className="lede">Write drafts, review them, and approve. Approved articles go live on their date by themselves.</p>
        </div>
        <div className="row">
          <ActionButton url={`/api/sites/${id}/generate`} body={{ count: 3 }} label="Write 3 drafts" mark />
          <ActionButton url={`/api/sites/${id}/publish-due`} label="Publish due now" confirm="Publish all approved articles dated today or earlier?" />
        </div>
      </div>
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <Link key={t.key} href={t.key === "all" ? `/sites/${id}/articles` : `/sites/${id}/articles?status=${t.key}`} className={`tab ${tab.key === t.key ? "on" : ""}`} role="tab" aria-selected={tab.key === t.key}>
            {t.label}<span className="count">{n(t)}</span>
          </Link>
        ))}
      </div>
      <ArticlesList siteId={id} rows={shown.map((x) => ({ id: x.id, title: x.title, status: x.status, publish_date: x.publish_date, wp_link: x.wp_link }))} />
    </>
  );
}
