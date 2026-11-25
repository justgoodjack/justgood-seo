import { decrypt } from "./crypto";
import type { Site } from "./types";

const UA = "Mozilla/5.0 (compatible; SeoGeoEngine/0.1)";

export class WP {
  private base: string;
  private auth: string;

  constructor(private site: Pick<Site, "wp_url" | "wp_user" | "wp_app_pass_enc" | "seo_plugin">) {
    this.base = site.wp_url.replace(/\/+$/, "");
    const pass = decrypt(site.wp_app_pass_enc);
    this.auth = "Basic " + Buffer.from(`${site.wp_user}:${pass}`).toString("base64");
  }

  private async req(path: string, init: RequestInit = {}, query = ""): Promise<Response> {
    const url = `${this.base}/wp-json${path}${query}`;
    try {
      const res = await fetch(url, {
        ...init,
        redirect: "manual", // a redirect would drop the login or turn a POST into a GET, so refuse it loudly
        headers: { Authorization: this.auth, "User-Agent": UA, ...(init.headers as Record<string, string>) },
      });
      if (res.status >= 300 && res.status < 400) {
        throw new Error(`WordPress redirected the request to ${res.headers.get("location") ?? "another address"}. Set the WordPress URL in Settings to exactly that address, including https:// and any www.`);
      }
      return res;
    } catch (e) {
      if ((e as Error).message.startsWith("WordPress redirected")) throw e;
      const cause = (e as { cause?: { code?: string; message?: string } }).cause;
      throw new Error(`Could not reach ${url} (${cause?.code ?? cause?.message ?? (e as Error).message}). Check the WordPress URL is exactly your site address starting with https:// and opens in a browser.`);
    }
  }

  private async json<T>(res: Response): Promise<T> {
    const text = await res.text();
    if (!res.ok) throw new Error(`WordPress ${res.status}: ${text.slice(0, 300)}`);
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`WordPress returned non-JSON (is a firewall or CAPTCHA blocking the server?): ${text.slice(0, 200)}`);
    }
  }

  async whoami() {
    const u = await this.json<{ id: number; name: string; capabilities?: Record<string, boolean> }>(
      await this.req("/wp/v2/users/me", {}, "?context=edit"),
    );
    return { id: u.id, name: u.name, canPublish: !!u.capabilities?.publish_posts, canUnfiltered: !!u.capabilities?.unfiltered_html };
  }

  async categories() {
    return this.json<{ id: number; name: string }[]>(await this.req("/wp/v2/categories", {}, "?per_page=100&_fields=id,name"));
  }

  async uploadMedia(bytes: Buffer, filename: string, mime: string, alt: string) {
    const res = await this.req("/wp/v2/media", {
      method: "POST",
      headers: { "Content-Type": mime, "Content-Disposition": `attachment; filename="${filename}"` },
      body: new Uint8Array(bytes),
    });
    const m = await this.json<{ id: number; source_url: string }>(res);
    if (alt) {
      await this.req("/wp/v2/media/" + m.id, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alt_text: alt }),
      }).catch(() => undefined);
    }
    return { id: m.id, url: m.source_url };
  }

  private seoMeta(desc: string): Record<string, string> | undefined {
    if (!desc) return undefined;
    if (this.site.seo_plugin === "yoast") return { _yoast_wpseo_metadesc: desc };
    if (this.site.seo_plugin === "rankmath") return { rank_math_description: desc };
    return undefined;
  }

  /** Create (no postId) or update (postId) a published post. */
  async publish(p: {
    postId?: number | null;
    title: string;
    slug?: string;
    html: string;
    excerpt: string;
    mediaId?: number | null;
    categoryId?: number | null;
  }): Promise<{ id: number; link: string }> {
    const body: Record<string, unknown> = {
      title: p.title,
      content: p.html,
      excerpt: p.excerpt,
      status: "publish",
    };
    if (p.slug && !p.postId) body.slug = p.slug;
    if (p.mediaId) body.featured_media = p.mediaId;
    if (p.categoryId) body.categories = [p.categoryId];
    const meta = this.seoMeta(p.excerpt);
    const path = p.postId ? `/wp/v2/posts/${p.postId}` : "/wp/v2/posts";
    const send = (b: unknown) =>
      this.req(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });

    let res = await send(meta ? { ...body, meta } : body);
    if (!res.ok && meta) res = await send(body); // meta key not registered on this site: retry without it
    const out = await this.json<{ id?: number; link?: string; status?: string }>(res);
    if (typeof out.id !== "number" || !out.link) {
      throw new Error("WordPress replied, but did not create a post. Check the WordPress URL in Settings and try the connection test.");
    }
    if (out.status !== "publish") {
      throw new Error(`WordPress saved the post but left it as "${out.status}" instead of publishing it. Check that this user's role can publish posts.`);
    }
    // Trust but verify: read it back so we never report success for a post that is not there.
    const check = await this.json<{ id: number; status: string; link: string }>(await this.req(`/wp/v2/posts/${out.id}`, {}, "?context=edit&_fields=id,status,link"));
    if (check.status !== "publish") throw new Error(`The post was created (#${out.id}) but its status is "${check.status}", not live.`);
    return { id: out.id, link: check.link || out.link };
  }

  /** Create one clearly labelled draft so the whole write path can be proven safely. */
  async testDraft() {
    const res = await this.req("/wp/v2/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "SEO Engine test draft (safe to delete)", content: "<p>This draft was created by the SEO + GEO Engine to test the connection. You can delete it.</p>", status: "draft" }),
    });
    const out = await this.json<{ id?: number; status?: string }>(res);
    if (typeof out.id !== "number") throw new Error("WordPress replied, but did not create a post.");
    return { id: out.id, status: out.status ?? "draft", editUrl: `${this.base}/wp-admin/post.php?post=${out.id}&action=edit` };
  }

  /** Move a post to the WordPress trash (recoverable there for 30 days). */
  async trashPost(id: number) {
    const res = await this.req(`/wp/v2/posts/${id}`, { method: "DELETE" });
    if (res.status === 404) return; // already gone
    await this.json(res);
  }

  async getPostRaw(id: number) {
    return this.json<{ id: number; link: string; title: { raw: string }; content: { raw: string } }>(
      await this.req(`/wp/v2/posts/${id}`, {}, "?context=edit"),
    );
  }

  /** All published posts (id, link, title, excerpt) for indexing existing content. */
  async listPublished(maxPages = 10) {
    const out: { id: number; link: string; title: string; excerpt: string }[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const res = await this.req("/wp/v2/posts", {}, `?per_page=100&page=${page}&status=publish&_fields=id,link,title,excerpt`);
      if (res.status === 400) break; // past last page
      const rows = await this.json<{ id: number; link: string; title: { rendered: string }; excerpt: { rendered: string } }[]>(res);
      for (const r of rows) {
        out.push({
          id: r.id,
          link: r.link,
          title: strip(r.title.rendered),
          excerpt: strip(r.excerpt.rendered).slice(0, 500),
        });
      }
      if (rows.length < 100) break;
    }
    return out;
  }
}

export function strip(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#\d+;|&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
