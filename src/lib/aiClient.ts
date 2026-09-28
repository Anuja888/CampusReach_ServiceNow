/**
 * Thin AI client — all model calls go through callModel().
 * Points at VITE_AI_PROXY_URL if set, falls back to Gemini directly.
 * Zero API keys = returns null silently.
 */

import type { Category, UrgencyLevel } from "@/types";

export interface AIClassifyRequest {
  text: string;           // already redacted by caller
  existingScore: number;  // rules score, AI may not lower urgency below this
}

export interface AIClassifyResponse {
  primaryCategory: Category;
  secondaryCategory: Category | null;
  urgencyLevel: UrgencyLevel;
  crisisSignal: boolean;
  confidence: number;       // 0–1
  evidencePhrases: string[]; // verbatim substrings of the original text
  language: string;
}

const VALID_CATEGORIES: Category[] = [
  "mental_health",
  "academic_stress",
  "financial",
  "housing",
  "crisis",
  "physical_health",
  "social_isolation",
  "general",
];

const VALID_URGENCIES: UrgencyLevel[] = ["low", "medium", "high", "crisis"];

const AI_CACHE_KEY = "campusreach_ai_cache";
const CACHE_MAX = 50;

// ── Cache helpers ─────────────────────────────────────────────────────────────

function loadCache(): Record<string, AIClassifyResponse & { cachedAt: string }> {
  try {
    return JSON.parse(localStorage.getItem(AI_CACHE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveCache(
  cache: Record<string, AIClassifyResponse & { cachedAt: string }>
) {
  try {
    // Trim oldest entries if over limit
    const entries = Object.entries(cache);
    if (entries.length > CACHE_MAX) {
      entries.sort((a, b) =>
        a[1].cachedAt < b[1].cachedAt ? -1 : 1
      );
      const trimmed = Object.fromEntries(entries.slice(-CACHE_MAX));
      localStorage.setItem(AI_CACHE_KEY, JSON.stringify(trimmed));
    } else {
      localStorage.setItem(AI_CACHE_KEY, JSON.stringify(cache));
    }
  } catch {
    // storage full — silently skip
  }
}

// ── PII redaction ─────────────────────────────────────────────────────────────

const PII_PATTERNS: [RegExp, string][] = [
  [/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g, "[email]"],
  [/\b(\+91[\-\s]?)?[6-9]\d{9}\b/g, "[phone]"],          // Indian mobile
  [/\b\d{10,12}\b/g, "[id]"],                              // roll/student IDs
  [/\b[A-Z]{2,3}[0-9]{6,10}\b/g, "[id]"],                 // alphanumeric IDs
];

export function redactPII(text: string): string {
  let out = text;
  for (const [pattern, replacement] of PII_PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

// ── Validation ────────────────────────────────────────────────────────────────

function validate(
  raw: unknown,
  originalText: string
): AIClassifyResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  if (!VALID_CATEGORIES.includes(r.primaryCategory as Category)) return null;
  if (
    r.secondaryCategory !== null &&
    !VALID_CATEGORIES.includes(r.secondaryCategory as Category)
  )
    return null;
  if (!VALID_URGENCIES.includes(r.urgencyLevel as UrgencyLevel)) return null;
  if (typeof r.crisisSignal !== "boolean") return null;
  if (typeof r.confidence !== "number" || r.confidence < 0 || r.confidence > 1)
    return null;
  if (!Array.isArray(r.evidencePhrases)) return null;

  const lowerText = originalText.toLowerCase();

  // Validate every evidencePhrase is a verbatim substring — reject hallucinations
  const validPhrases = (r.evidencePhrases as unknown[]).filter(
    (p): p is string =>
      typeof p === "string" && lowerText.includes(p.toLowerCase())
  );

  return {
    primaryCategory: r.primaryCategory as Category,
    secondaryCategory: (r.secondaryCategory as Category) ?? null,
    urgencyLevel: r.urgencyLevel as UrgencyLevel,
    crisisSignal: r.crisisSignal as boolean,
    confidence: r.confidence as number,
    evidencePhrases: validPhrases,
    language: typeof r.language === "string" ? r.language : "en",
  };
}

// ── callModel ─────────────────────────────────────────────────────────────────

const URGENCY_NUM: Record<UrgencyLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  crisis: 3,
};
const URGENCY_FROM_NUM: UrgencyLevel[] = ["low", "medium", "high", "crisis"];

/**
 * Classify text using Gemini (or proxy).
 * Returns null if unavailable, invalid, or confidence < 0.6.
 * AI may only escalate urgency, never lower it below rules score.
 */
export async function callModel(
  req: AIClassifyRequest
): Promise<(AIClassifyResponse & { fromCache?: boolean }) | null> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  const proxyUrl = import.meta.env.VITE_AI_PROXY_URL as string | undefined;

  if (!apiKey && !proxyUrl) return null;

  const redacted = redactPII(req.text);
  const cacheKey = redacted.trim().toLowerCase().slice(0, 200);

  // ── Check cache first ───────────────────────────────────────────────────
  const cache = loadCache();
  if (cache[cacheKey]) {
    return { ...cache[cacheKey], fromCache: true };
  }

  const prompt = `You are a student support triage system. Classify the following student message.
Respond with STRICT JSON only — no markdown, no commentary, exactly this shape:
{
  "primaryCategory": one of ${JSON.stringify(VALID_CATEGORIES)},
  "secondaryCategory": one of the same enum or null,
  "urgencyLevel": one of ${JSON.stringify(VALID_URGENCIES)},
  "crisisSignal": boolean — true ONLY if the student may be in immediate danger,
  "confidence": number 0.0–1.0,
  "evidencePhrases": array of verbatim substrings from the student text that justify the classification,
  "language": ISO 639-1 language code or "hinglish" or "telugu-roman"
}

Rules:
- evidencePhrases MUST be exact substrings of the student text.
- If crisisSignal is true, urgencyLevel must be "crisis".
- Be conservative: over-flag rather than under-flag crisis.

Student text:
"""
${redacted}
"""`;

  const endpoint = proxyUrl
    ? `${proxyUrl}/classify`
    : `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const body = proxyUrl
    ? JSON.stringify({ text: redacted })
    : JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 256 },
      });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  let raw: AIClassifyResponse | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!resp.ok) break;

      const data = await resp.json();

      let parsed: unknown;
      if (proxyUrl) {
        parsed = data;
      } else {
        const text: string =
          data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        // Strip markdown fences if model wraps response
        const cleaned = text
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();
        parsed = JSON.parse(cleaned);
      }

      raw = validate(parsed, req.text);
      if (raw) break;
    } catch {
      clearTimeout(timeout);
      if (attempt === 1) return null;
    }
  }

  if (!raw || raw.confidence < 0.6) return null;

  // AI may only ESCALATE urgency
  const rulesLevel = URGENCY_FROM_NUM[
    Math.max(
      0,
      Math.floor(req.existingScore / 4)  // rough mapping: 0-3→low, 4-7→med, 8-11→high, 12+→crisis
    ) > 3
      ? 3
      : Math.floor(req.existingScore / 4)
  ];

  const aiNum = URGENCY_NUM[raw.urgencyLevel];
  const rulesNum = URGENCY_NUM[rulesLevel];
  if (aiNum < rulesNum) {
    raw = { ...raw, urgencyLevel: rulesLevel };
  }

  // Cache successful result
  cache[cacheKey] = { ...raw, cachedAt: new Date().toISOString() };
  saveCache(cache);

  return raw;
}
