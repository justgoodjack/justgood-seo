import { createSign } from "node:crypto";
import { db, must, logJob } from "./db";
import { addDays, env, todayUTC } from "./config";
import type { Site } from "./types";

// Service-account auth with no googleapis dependency.
// Setup: create a service account, enable the Search Console API, and add the service
// account email as a (restricted is fine) user on each GSC property.

async function accessToken(): Promise<string> {
  const b64 = env("GOOGLE_SERVICE_ACCOUNT_B64", false);
  if (!b64) throw new Error("GOOGLE_SERVICE_ACCOUNT_B64 not set");
  const sa = JSON.parse(Buffer.from(b64, "base64").toString("utf8")) as { client_email: string; private_key: string };
  const now = Math.floor(Date.now() / 1000);
  const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${enc({ alg: "RS256", typ: "JWT" })}.${enc({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const sig = createSign("RSA-SHA256").update(unsigned).sign(sa.private_key).toString("base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${sig}` }),
  });
  if (!res.ok) throw new Error(`Google token ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).access_token;
}

interface Row { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }

async function query(token: string, property: string, start: string, end: string, dimensions: string[]): Promise<Row[]> {
  const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ startDate: start, endDate: end, dimensions, rowLimit: 1000 }),
  });
  if (!res.ok) throw new Error(`GSC ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return ((await res.json()).rows ?? []) as Row[];
}

const norm = (u: string) => u.replace(/#.*$/, "").replace(/\/+$/, "").toLowerCase();

/** Pull 28d vs previous 28d per page, store it, and queue refresh drafts for decaying or underperforming posts. */
export async function syncGsc(site: Site, maxQueue = 2) {
  if (!site.gsc_property) throw new Error("Site has no gsc_property");
  const token = await accessToken();
  const end = addDays(todayUTC(), -3); // GSC data lags ~2-3 days
  const curStart = addDays(end, -27);
  const prevEnd = addDays(curStart, -1);
  const prevStart = addDays(prevEnd, -27);

  const [cur, prev] = await Promise.all([
    query(token, site.gsc_property, curStart, end, ["page"]),
    query(token, site.gsc_property, prevStart, prevEnd, ["page"]),
  ]);

  await db().from("gsc_metrics").delete().eq("site_id", site.id);
  const toRow = (r: Row, range: "current" | "previous", s: string, e: string) => ({
    site_id: site.id, page_url: r.keys[0], query: "", clicks: r.clicks, impressions: r.impressions,
    ctr: r.ctr, position: r.position, date_range: range, period_start: s, period_end: e,
  });
  const rows = [...cur.map((r) => toRow(r, "current", curStart, end)), ...prev.map((r) => toRow(r, "previous", prevStart, prevEnd))];
  for (let i = 0; i < rows.length; i += 500) must(await db().from("gsc_metrics").insert(rows.slice(i, i + 500)).select("id"));

  const prevMap = new Map(prev.map((r) => [norm(r.keys[0]), r]));
  const indexed = must(await db().from("internal_link_index").select("wp_post_id,url,title").eq("site_id", site.id)) as { wp_post_id: number; url: string; title: string }[];
  const byUrl = new Map(indexed.map((p) => [norm(p.url), p]));

  const candidates: { post: { wp_post_id: number; title: string }; reason: string; score: number }[] = [];
  for (const r of cur) {
    const post = byUrl.get(norm(r.keys[0]));
    if (!post) continue; // only rewrite posts we can map to a WordPress ID
    const p = prevMap.get(norm(r.keys[0]));
    if (p && p.clicks >= 10 && r.clicks < p.clicks * 0.8) {
      candidates.push({ post, reason: `clicks dropped ${Math.round((1 - r.clicks / p.clicks) * 100)}% (${p.clicks} to ${r.clicks}) over 28 days`, score: p.clicks - r.clicks });
    } else if (r.position >= 8 && r.position <= 20 && r.impressions >= 100 && r.ctr < 0.02) {
      candidates.push({ post, reason: `position ${r.position.toFixed(1)} with ${r.impressions} impressions and ${(r.ctr * 100).toFixed(1)}% CTR`, score: r.impressions });
    }
  }
  candidates.sort((a, b) => b.score - a.score);

  const open = (must(await db().from("articles").select("wp_post_id").eq("site_id", site.id).eq("kind", "refresh").in("status", ["queued", "pending_review", "approved"])) as { wp_post_id: number }[]).map((a) => a.wp_post_id);
  let queued = 0;
  for (const c of candidates) {
    if (queued >= maxQueue) break;
    if (open.includes(c.post.wp_post_id)) continue;
    must(await db().from("articles").insert({ site_id: site.id, kind: "refresh", title: c.post.title, wp_post_id: c.post.wp_post_id, status: "queued", notes: c.reason }).select("id"));
    queued++;
  }
  await logJob("gsc", site.id, true, `pages=${cur.length} candidates=${candidates.length} queued=${queued}`);
  return { pages: cur.length, candidates: candidates.length, queued };
}
