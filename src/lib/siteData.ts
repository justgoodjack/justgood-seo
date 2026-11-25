import { db, must } from "./db";
import type { Article, Keyword, Site } from "./types";
import type { CalItem } from "@/components/ContentCalendar";

export async function getSite(id: string): Promise<Site> {
  return must(await db().from("sites").select("*").eq("id", id).single()) as Site;
}

export const todayISO = () => new Date().toISOString().slice(0, 10);

/** Everything scheduled on a date: articles (any live status) plus planned topics not yet written. */
export function buildCalItems(articles: Article[], keywords: Keyword[]): CalItem[] {
  const written = new Set(articles.map((x) => x.keyword_id).filter(Boolean));
  return [
    ...articles.filter((x) => x.publish_date && x.status !== "rejected").map((x) => ({ id: x.id, kind: "article" as const, date: x.publish_date as string, label: x.title || "Refresh", status: x.status, href: `/articles/${x.id}` })),
    ...keywords.filter((k) => k.status === "scheduled" && k.scheduled_date && !written.has(k.id)).map((k) => ({ id: k.id, kind: "topic" as const, date: k.scheduled_date as string, label: k.phrase, status: "scheduled" })),
  ];
}
