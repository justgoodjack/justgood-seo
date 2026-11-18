import { env } from "./config";

export const NO_TEXT =
  "Pure photograph with absolutely no text, no words, no letters, no numbers, no captions, no titles, no signs, no banners, no posters, no logos, no watermarks, no screens or pages with writing. Avoid placards, books, newspapers and storefront signage.";

/** Cloudflare Workers AI (FLUX.1 schnell). Returns null if not configured or on failure. */
export async function generateImage(prompt: string): Promise<Buffer | null> {
  const acct = env("CLOUDFLARE_ACCOUNT_ID", false);
  const token = env("CLOUDFLARE_API_TOKEN", false);
  if (!acct || !token) return null;
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/ai/run/@cf/black-forest-labs/flux-1-schnell`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: `${prompt.slice(0, 1500)}. ${NO_TEXT}`, steps: 6 }),
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

export interface StockPhoto { bytes: Buffer; credit: string; stockId: string }

async function download(url: string): Promise<Buffer | null> {
  const r = await fetch(url);
  return r.ok ? Buffer.from(await r.arrayBuffer()) : null;
}

async function pexels(query: string, seen: Set<string>): Promise<StockPhoto | null> {
  const key = env("PEXELS_API_KEY", false);
  if (!key) return null;
  for (let page = 1; page <= 3; page++) {
    const q = new URLSearchParams({ query: query.slice(0, 100), per_page: "30", orientation: "landscape", page: String(page) });
    const res = await fetch(`https://api.pexels.com/v1/search?${q}`, { headers: { Authorization: key } });
    if (!res.ok) return null;
    const photos: { id: number; photographer: string; src: { large2x?: string; large?: string } }[] = (await res.json()).photos ?? [];
    if (!photos.length) return null;
    const p = photos.find((x) => !seen.has(`pexels:${x.id}`));
    const src = p?.src.large2x ?? p?.src.large;
    if (p && src) {
      const bytes = await download(src);
      if (bytes) return { bytes, credit: `Photo by ${p.photographer} on Pexels`, stockId: `pexels:${p.id}` };
    }
  }
  return null;
}

async function pixabay(query: string, seen: Set<string>): Promise<StockPhoto | null> {
  const key = env("PIXABAY_API_KEY", false);
  if (!key) return null;
  for (let page = 1; page <= 3; page++) {
    const q = new URLSearchParams({ key, q: query.slice(0, 100), image_type: "photo", orientation: "horizontal", safesearch: "true", per_page: "30", page: String(page) });
    const res = await fetch(`https://pixabay.com/api/?${q}`);
    if (!res.ok) return null;
    const hits: { id: number; user: string; largeImageURL?: string }[] = (await res.json()).hits ?? [];
    if (!hits.length) return null;
    const h = hits.find((x) => x.largeImageURL && !seen.has(`pixabay:${x.id}`));
    if (h?.largeImageURL) {
      const bytes = await download(h.largeImageURL);
      if (bytes) return { bytes, credit: `Image by ${h.user} on Pixabay`, stockId: `pixabay:${h.id}` };
    }
  }
  return null;
}

/** Free stock photo: tries each query on Pexels then Pixabay, skipping photos already shown (`exclude`). */
export async function findStockPhoto(queries: string | string[], exclude: string[] = []): Promise<StockPhoto | null> {
  const seen = new Set(exclude);
  for (const q of Array.isArray(queries) ? queries : [queries]) {
    if (!q.trim()) continue;
    const hit = (await pexels(q, seen).catch(() => null)) ?? (await pixabay(q, seen).catch(() => null));
    if (hit) return hit;
  }
  return null;
}
