import { generate } from "./gemini";
import { findYouTubeVideo } from "./media";
import type { LinkCandidate } from "./linker";
import type { Site } from "./types";

export interface Draft {
  title: string;
  slug: string;
  metaDesc: string;
  imagePrompt: string;
  html: string;
  faq: { q: string; a: string }[];
  sources: { uri: string; title: string }[];
}

const SYSTEM = `You are a senior SEO editor writing for a real blog. Write original, accurate, genuinely useful articles for humans first.
Hard rules:
- Ground every factual claim with Google Search. Never invent statistics, studies, quotes, prices, or product details. If you cannot verify something, leave it out.
- GEO structure: open every H2 section with a direct, self-contained 2-sentence answer, then expand. Include at least one HTML comparison <table> where it fits. End with a visible FAQ section (H2 "Frequently Asked Questions", each question an H3 with a short answer).
- Cite primary sources inline with <a href> links to the real source pages you found. Link text must be descriptive.
- Output clean semantic HTML only for the body: h2, h3, p, ul, ol, li, table, strong, em, a, blockquote. No h1, no <html>/<body>, no inline styles, no scripts, no markdown.
- Insert exactly 2 image placeholders as HTML comments in the form <!--IMG: short concrete visual description, no text in image--> directly after the opening answer of two different H2 sections. Never write <img> tags yourself.
- No filler intros ("In today's fast-paced world"), no AI-sounding clichés, no em dashes.`;

function stripUnsafe(html: string): string {
  return html
    .replace(/^```(?:html)?\s*/i, "")
    .replace(/```\s*$/, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?(html|head|body)[^>]*>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .trim();
}

function parseSections(text: string) {
  const m = text.match(/===META===\s*([\s\S]*?)\s*===BODY===\s*([\s\S]*)/);
  if (!m) throw new Error("Writer output missing ===META=== / ===BODY=== markers");
  const meta = JSON.parse(m[1].replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim());
  return { meta, body: m[2] };
}

export async function writeArticle(site: Site, keyword: string, links: LinkCandidate[], extraContext = ""): Promise<Draft> {
  const voice = site.voice_prompt ? `Brand voice and rules:\n${site.voice_prompt}\n` : "";
  const examples = site.example_urls.length ? `Match the tone of these example posts if you can read them: ${site.example_urls.join(", ")}\n` : "";
  const linkBlock = links.length
    ? `Weave 3 to ${Math.min(5, links.length)} of these internal links in naturally, using descriptive anchor text, only where genuinely relevant. Use these exact URLs and no other internal URLs:\n${links.map((l) => `- ${l.url} (${l.title})`).join("\n")}\n`
    : "";

  const prompt = `Blog: ${site.name} (${site.domain}). Niche: ${site.niche || "general"}.
${voice}${examples}Target keyword: "${keyword}"
${extraContext}
Write a complete article of roughly 1,400 to 1,900 words that would deserve to rank for the keyword and be quoted by AI assistants.
${linkBlock}
Respond in EXACTLY this format, nothing before or after:
===META===
{"title": "...(under 62 chars, includes keyword naturally)", "slug": "kebab-case-slug", "meta_description": "...(140-155 chars)", "image_prompt": "...(one sentence describing a fitting hero image, in this style: ${site.image_style})", "faq": [{"q": "...", "a": "...(1-3 sentences, plain text)"}]}
===BODY===
<the HTML body>`;

  const r = await generate({ system: SYSTEM, prompt, grounding: true, temperature: 0.6 });
  const { meta, body } = parseSections(r.text);

  let html = stripUnsafe(body);

  // Optional YouTube embed, placed after the first section.
  const vid = await findYouTubeVideo(keyword).catch(() => null);
  if (vid) {
    const embed = `<figure class="wp-block-embed"><iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/${vid.id}" title="${vid.title.replace(/"/g, "&quot;")}" loading="lazy" allowfullscreen></iframe></figure>`;
    const idx = html.indexOf("<h2", html.indexOf("<h2") + 3);
    html = idx > 0 ? html.slice(0, idx) + embed + html.slice(idx) : html + embed;
  }

  // Dedupe grounded sources by host+path.
  const seen = new Set<string>();
  const sources = r.sources.filter((s) => (seen.has(s.uri) ? false : (seen.add(s.uri), true)));

  return {
    title: String(meta.title ?? keyword).slice(0, 120),
    slug: String(meta.slug ?? keyword).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80),
    metaDesc: String(meta.meta_description ?? "").slice(0, 170),
    imagePrompt: String(meta.image_prompt ?? `${keyword}, ${site.image_style}`),
    html,
    faq: Array.isArray(meta.faq) ? meta.faq.filter((f: { q?: string; a?: string }) => f.q && f.a) : [],
    sources,
  };
}

export function faqJsonLd(faq: { q: string; a: string }[]) {
  if (!faq.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

/** Appended at publish time (not stored in html_body, so the editor stays clean). */
export function withSchema(html: string, faq: unknown): string {
  if (!faq) return html;
  return `${html}\n<script type="application/ld+json">${JSON.stringify(faq).replace(/</g, "\\u003c")}</script>`;
}
