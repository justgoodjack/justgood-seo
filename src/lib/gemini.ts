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

/** Retries rate limits / overload, then falls back to the lighter model. */
export async function generate(o: GenOpts): Promise<GenResult> {
  const models = [env("GEMINI_MODEL", false) || "gemini-2.5-flash", env("GEMINI_FALLBACK_MODEL", false)].filter(Boolean);
  let lastErr: unknown;
  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await callOnce(model, o);
      } catch (e) {
        lastErr = e;
        const status = (e as { status?: number }).status;
        if (status === 429 || status === 503 || status === 500) await sleep(2000 * (attempt + 1));
        else break; // non-retryable on this model
      }
    }
  }
  throw lastErr;
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
