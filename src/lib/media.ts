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
  const pool: { id: number; photographer: string; src: { large2x?: string; large?: string } }[] = [];
  for (let page = 1; page <= 3; page++) {
    const q = new URLSearchParams({ query: query.slice(0, 100), per_page: "30", orientation: "landscape", page: String(page) });
    const res = await fetch(`https://api.pexels.com/v1/search?${q}`, { headers: { Authorization: key } });
    if (!res.ok) break;
    const photos = (await res.json()).photos ?? [];
    if (!photos.length) break;
    pool.push(...photos.filter((x: { id: number }) => !seen.has(`pexels:${x.id}`)));
  }
  for (let tries = 0; tries < 4 && pool.length; tries++) {
    const [p] = pool.splice(Math.floor(Math.random() * pool.length), 1);
    const src = p.src.large2x ?? p.src.large;
    const bytes = src ? await download(src) : null;
    if (bytes) return { bytes, credit: `Photo by ${p.photographer} on Pexels`, stockId: `pexels:${p.id}` };
  }
  return null;
}

async function pixabay(query: string, seen: Set<string>): Promise<StockPhoto | null> {
  const key = env("PIXABAY_API_KEY", false);
  if (!key) return null;
  const pool: { id: number; user: string; largeImageURL?: string }[] = [];
  for (let page = 1; page <= 3; page++) {
    const q = new URLSearchParams({ key, q: query.slice(0, 100), image_type: "photo", orientation: "horizontal", safesearch: "true", per_page: "30", page: String(page) });
    const res = await fetch(`https://pixabay.com/api/?${q}`);
    if (!res.ok) break;
    const hits = (await res.json()).hits ?? [];
    if (!hits.length) break;
    pool.push(...hits.filter((x: { id: number; largeImageURL?: string }) => x.largeImageURL && !seen.has(`pixabay:${x.id}`)));
  }
  for (let tries = 0; tries < 4 && pool.length; tries++) {
    const [h] = pool.splice(Math.floor(Math.random() * pool.length), 1);
    const bytes = await download(h.largeImageURL!);
    if (bytes) return { bytes, credit: `Image by ${h.user} on Pixabay`, stockId: `pixabay:${h.id}` };
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

export interface StockCandidate { stockId: string; thumb: string; full: string; credit: string }

/** Search both stock sites and return thumbnails to choose from (nothing is downloaded). */
export async function searchStock(queries: string[], page = 1, exclude: string[] = [], limit = 12): Promise<StockCandidate[]> {
  const seen = new Set(exclude);
  const pex: StockCandidate[] = [];
  const pix: StockCandidate[] = [];
  const pexKey = env("PEXELS_API_KEY", false);
  const pixKey = env("PIXABAY_API_KEY", false);
  for (const query of queries.filter((q) => q.trim())) {
    if (pexKey) {
      const q = new URLSearchParams({ query: query.slice(0, 100), per_page: "12", orientation: "landscape", page: String(page) });
      const res = await fetch(`https://api.pexels.com/v1/search?${q}`, { headers: { Authorization: pexKey } }).catch(() => null);
      if (res?.ok) {
        for (const p of (await res.json()).photos ?? []) {
          const id = `pexels:${p.id}`;
          if (!seen.has(id) && !pex.some((x) => x.stockId === id)) pex.push({ stockId: id, thumb: p.src.medium, full: p.src.large2x ?? p.src.large, credit: `Photo by ${p.photographer} on Pexels` });
        }
      }
    }
    if (pixKey) {
      const q = new URLSearchParams({ key: pixKey, q: query.slice(0, 100), image_type: "photo", orientation: "horizontal", safesearch: "true", per_page: "12", page: String(page) });
      const res = await fetch(`https://pixabay.com/api/?${q}`).catch(() => null);
      if (res?.ok) {
        for (const h of (await res.json()).hits ?? []) {
          const id = `pixabay:${h.id}`;
          if (h.largeImageURL && !seen.has(id) && !pix.some((x) => x.stockId === id)) pix.push({ stockId: id, thumb: h.webformatURL, full: h.largeImageURL, credit: `Image by ${h.user} on Pixabay` });
        }
      }
    }
    if (pex.length + pix.length >= limit) break;
  }
  const out: StockCandidate[] = [];
  for (let i = 0; out.length < limit && (i < pex.length || i < pix.length); i++) {
    if (pex[i]) out.push(pex[i]);
    if (out.length < limit && pix[i]) out.push(pix[i]);
  }
  return out;
}

export async function downloadStock(url: string): Promise<Buffer> {
  const host = new URL(url).hostname;
  if (!/(^|\.)(pexels\.com|pixabay\.com)$/.test(host)) throw new Error("Not a Pexels or Pixabay image URL");
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Image download failed (${r.status})`);
  return Buffer.from(await r.arrayBuffer());
}
