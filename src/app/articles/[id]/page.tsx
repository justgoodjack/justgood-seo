import { redirect } from "next/navigation";
import { db, must } from "@/lib/db";

// Old address kept working: send it to the article inside its blog.
export default async function OldArticleUrl({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = must(await db().from("articles").select("site_id").eq("id", id).single()) as { site_id: string };
  redirect(`/sites/${a.site_id}/articles/${id}`);
}
