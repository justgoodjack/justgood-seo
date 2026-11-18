import { NextRequest, NextResponse } from "next/server";
import { db, must } from "@/lib/db";
import { deleteArticle } from "@/lib/pipeline";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const b = await req.json();
  const patch: Record<string, unknown> = {};
  for (const k of ["title", "slug", "html_body", "meta_desc", "publish_date"]) if (k in b) patch[k] = b[k];
  if (b.status && ["pending_review", "approved", "rejected"].includes(b.status)) patch.status = b.status;
  try {
    must(await db().from("articles").update(patch).eq("id", id).select("id"));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  try {
    const art = must(await db().from("articles").select("site_id").eq("id", id).single()) as { site_id: string };
    const r = await deleteArticle(art.site_id, id, req.nextUrl.searchParams.get("wp") === "1");
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
