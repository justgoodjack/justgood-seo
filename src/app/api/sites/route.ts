import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

const list = (v: unknown) => String(v ?? "").split(/[\n,]/).map((s) => s.trim()).filter(Boolean);

export async function POST(req: NextRequest) {
  const f = await req.formData();
  const { data, error } = await db().from("sites").insert({
    name: String(f.get("name")),
    domain: String(f.get("domain")).replace(/^https?:\/\//, "").replace(/\/.*$/, ""),
    wp_url: String(f.get("wp_url")).replace(/\/+$/, ""),
    wp_user: String(f.get("wp_user")),
    wp_app_pass_enc: encrypt(String(f.get("wp_app_pass"))),
    niche: String(f.get("niche") ?? ""),
    seed_topics: list(f.get("seed_topics")),
    voice_prompt: String(f.get("voice_prompt") ?? ""),
    example_urls: list(f.get("example_urls")),
    publish_mode: f.get("publish_mode") === "autopilot" ? "autopilot" : "batch_preview",
    cadence_per_month: Number(f.get("cadence_per_month") || 12),
    seo_plugin: String(f.get("seo_plugin") || "none"),
    gsc_property: String(f.get("gsc_property") || "") || null,
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.redirect(new URL(`/sites/${data.id}`, req.url), 303);
}
