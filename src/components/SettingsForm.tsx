"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Site } from "@/lib/types";

const lines = (s: string) => s.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);

export function SettingsForm({ site }: { site: Site }) {
  const [msg, setMsg] = useState("");
  const router = useRouter();
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      wp_url: String(f.get("wp_url") || "").trim().replace(/\/+$/, ""), wp_user: String(f.get("wp_user") || "").trim(),
      niche: f.get("niche"), voice_prompt: f.get("voice_prompt"), image_style: f.get("image_style"),
      publish_mode: f.get("publish_mode"), cadence_per_month: Number(f.get("cadence_per_month")),
      seo_plugin: f.get("seo_plugin"), gsc_property: String(f.get("gsc_property") || "") || null,
      default_category_id: f.get("default_category_id") ? Number(f.get("default_category_id")) : null,
      seed_topics: lines(String(f.get("seed_topics"))), example_urls: lines(String(f.get("example_urls"))),
    };
    if (f.get("wp_app_pass")) body.wp_app_pass = f.get("wp_app_pass");
    const res = await fetch(`/api/sites/${site.id}/update`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setMsg(res.ok ? "Saved" : "Error: " + (await res.text()));
    router.refresh();
  }
  return (
    <form onSubmit={save} className="card">
      <div className="grid2">
        <div><label>WordPress URL (must start with https://)</label><input name="wp_url" defaultValue={site.wp_url} /></div>
        <div><label>WordPress username</label><input name="wp_user" defaultValue={site.wp_user} /></div>
        <div><label>Niche (one line)</label><input name="niche" defaultValue={site.niche} /></div>
        <div><label>Seed topics (comma or newline)</label><input name="seed_topics" defaultValue={site.seed_topics.join(", ")} /></div>
        <div><label>Publish mode</label>
          <select name="publish_mode" defaultValue={site.publish_mode}>
            <option value="batch_preview">Batch preview (review first)</option>
            <option value="autopilot">Autopilot (auto-approve)</option>
          </select></div>
        <div><label>Posts per month</label><input type="number" name="cadence_per_month" min={1} max={90} defaultValue={site.cadence_per_month} /></div>
        <div><label>SEO plugin</label>
          <select name="seo_plugin" defaultValue={site.seo_plugin}>
            <option value="none">None / not sure</option><option value="yoast">Yoast</option><option value="rankmath">Rank Math</option>
          </select></div>
        <div><label>Default WP category ID (optional)</label><input name="default_category_id" defaultValue={site.default_category_id ?? ""} /></div>
        <div><label>Search Console property</label><input name="gsc_property" placeholder="sc-domain:example.com" defaultValue={site.gsc_property ?? ""} /></div>
        <div><label>New WP Application Password (leave blank to keep)</label><input name="wp_app_pass" type="password" autoComplete="off" /></div>
      </div>
      <label>Brand voice and rules</label><textarea name="voice_prompt" defaultValue={site.voice_prompt} />
      <label>Example post URLs (tone reference)</label><input name="example_urls" defaultValue={site.example_urls.join(", ")} />
      <label>Image style</label><input name="image_style" defaultValue={site.image_style} />
      <p className="row"><button className="primary">Save settings</button><span className="muted">{msg}</span></p>
    </form>
  );
}
