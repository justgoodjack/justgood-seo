import { env, sleep } from "./config";

const BASE = "https://generativelanguage.googleapis.com/v1beta";

export interface GenResult {
  text: string;
  sources: { uri: string; title: string }[];
}

interface GenOpts {
  system?: string;
  prompt: string;
  grounding?: boolean; // Google Search grounding. Cannot be combined with JSON mime type.
  json?: boolean;
  temperature?: number;
}

async function callOnce(model: string, o: GenOpts): Promise<GenResult> {
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: o.prompt }] }],
    generationConfig: { temperature: o.temperature ?? 0.7, ...(o.json && !o.grounding ? { responseMimeType: "application/json" } : {}) },
  };
  if (o.system) body.systemInstruction = { parts: [{ text: o.system }] };
  if (o.grounding) body.tools = [{ google_search: {} }];

  const res = await fetch(`${BASE}/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": env("GEMINI_API_KEY") },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = new Error(`Gemini ${model} ${res.status}: ${(await res.text()).slice(0, 300)}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const cand = data.candidates?.[0];
  const text = (cand?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
  if (!text) throw new Error(`Gemini returned no text (finishReason=${cand?.finishReason ?? "unknown"})`);
  const chunks: { web?: { uri: string; title?: string } }[] = cand?.groundingMetadata?.groundingChunks ?? [];
  const sources = chunks.filter((c) => c.web?.uri).map((c) => ({ uri: c.web!.uri, title: c.web!.title ?? "" }));
  return { text, sources };
}

let discovered: string[] | null = null;

/** Ask Google which models this key can call, newest stable flash first (names change often). */
async function discoverModels(): Promise<string[]> {
  if (discovered) return discovered;
  const res = await fetch(`${BASE}/models?pageSize=200`, { headers: { "x-goog-api-key": env("GEMINI_API_KEY") } });
  if (!res.ok) throw new Error(`Gemini model list ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
  const ver = (n: string) => parseFloat(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? "0");
  const names = (data.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .filter((n) => /^gemini-[\d.]+-flash(-lite)?$/.test(n)); // stable aliases only
  const rank = (n: string) => ver(n) * 10 - (n.endsWith("-lite") ? 1 : 0);
  discovered = names.sort((a, b) => rank(b) - rank(a));
  return discovered;
}

/** Retries rate limits / overload, falls back to other models, and auto-discovers valid model names on 404. */
export async function generate(o: GenOpts): Promise<GenResult> {
  const configured = [env("GEMINI_MODEL", false), env("GEMINI_FALLBACK_MODEL", false)].filter(Boolean);
  let models = configured.length ? configured : await discoverModels();
  const errors: string[] = [];
  for (let pass = 0; pass < 2; pass++) {
    for (const model of models) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          return await callOnce(model, o);
        } catch (e) {
          const status = (e as { status?: number }).status;
          if (attempt === 2 || !(status === 429 || status === 503 || status === 500)) {
            errors.push(`${model}: ${(e as Error).message.slice(0, 160)}`);
            break;
          }
          await sleep(2000 * (attempt + 1));
        }
      }
    }
    if (pass === 0 && errors.some((m) => m.includes(" 404"))) {
      discovered = null;
      models = (await discoverModels()).slice(0, 3); // configured names are stale: use what exists now
    } else break;
  }
  throw new Error(`All Gemini models failed. ${errors.slice(-3).join(" | ")}`);
}

export function parseJson<T>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const start = Math.min(...["{", "["].map((c) => cleaned.indexOf(c)).filter((i) => i >= 0));
  return JSON.parse(cleaned.slice(start));
}

export async function embed(text: string, taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" = "RETRIEVAL_DOCUMENT"): Promise<number[]> {
  const res = await fetch(`${BASE}/models/gemini-embedding-001:embedContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": env("GEMINI_API_KEY") },
    body: JSON.stringify({
      content: { parts: [{ text: text.slice(0, 8000) }] },
      taskType,
      outputDimensionality: 768,
    }),
  });
  if (!res.ok) throw new Error(`Gemini embed ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data.embedding.values as number[];
}
