import { env } from "./config";

/** Cloudflare Workers AI (FLUX.1 schnell). Returns null if not configured or on failure. */
export async function generateImage(prompt: string): Promise<Buffer | null> {
  const acct = env("CLOUDFLARE_ACCOUNT_ID", false);
  const token = env("CLOUDFLARE_API_TOKEN", false);
  if (!acct || !token) return null;
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/ai/run/@cf/black-forest-labs/flux-1-schnell`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: prompt.slice(0, 2000), steps: 6 }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const b64: string | undefined = data?.result?.image;
  return b64 ? Buffer.from(b64, "base64") : null;
}

/** Top relevant YouTube video ID for a topic, or null. Costs 100 quota units of 10,000/day. */
export async function findYouTubeVideo(query: string): Promise<{ id: string; title: string } | null> {
  const key = env("YOUTUBE_API_KEY", false);
  if (!key) return null;
  const u = new URL("https://www.googleapis.com/youtube/v3/search");
  u.search = new URLSearchParams({ part: "snippet", q: query, type: "video", maxResults: "1", videoEmbeddable: "true", safeSearch: "strict", key }).toString();
  const res = await fetch(u);
  if (!res.ok) return null;
  const data = await res.json();
  const item = data.items?.[0];
  return item ? { id: item.id.videoId, title: item.snippet.title } : null;
}
