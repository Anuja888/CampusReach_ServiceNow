/**
 * Department routing logic.
 * Maps (category × urgency) → department + explanation sentence.
 * Explanation uses Gemini API if VITE_GEMINI_API_KEY is set,
 * otherwise falls back to a template sentence built from matched keywords.
 */

import type {
  Category,
  Department,
  MatchedKeyword,
  RoutingResult,
  ScoringResult,
  UrgencyLevel,
} from "@/types";

// ---------------------------------------------------------------------------
// Department catalogue — 12 campus support areas collapsed to 6 routable desks
// ---------------------------------------------------------------------------
export const DEPARTMENTS: Record<string, Department> = {
  crisis_line: {
    id: "crisis_line",
    name: "Crisis Support Line",
    shortName: "Crisis Line",
    description:
      "Immediate 24/7 support for students in acute distress. A trained counsellor will answer within minutes.",
    contact: "ext. 999 / 0800 111 222",
    typicalWait: "< 5 minutes",
    color: "crisis",
  },
  wellbeing: {
    id: "wellbeing",
    name: "Student Wellbeing Service",
    shortName: "Wellbeing",
    description:
      "Counselling, mental health support, and emotional wellbeing. First appointments within 3 working days.",
    contact: "wellbeing@university.ac.uk",
    typicalWait: "2–3 working days",
    color: "teal",
  },
  academic_support: {
    id: "academic_support",
    name: "Academic Support & Advising",
    shortName: "Academic Support",
    description:
      "Deadline extensions, mitigating circumstances, study skills coaching, and tutor referrals.",
    contact: "academic.support@university.ac.uk",
    typicalWait: "Same day response",
    color: "teal",
  },
  financial_aid: {
    id: "financial_aid",
    name: "Financial Aid & Hardship Fund",
    shortName: "Financial Aid",
    description:
      "Emergency bursaries, hardship grants, debt advice, and help navigating student finance.",
    contact: "financialaid@university.ac.uk",
    typicalWait: "1–2 working days",
    color: "teal",
  },
  housing: {
    id: "housing",
    name: "Student Housing & Accommodation",
    shortName: "Housing",
    description:
      "Emergency accommodation, tenancy disputes, and connections to local housing support.",
    contact: "housing@university.ac.uk",
    typicalWait: "Same day for emergencies",
    color: "teal",
  },
  health_centre: {
    id: "health_centre",
    name: "Campus Health Centre",
    shortName: "Health Centre",
    description:
      "GP and nursing appointments, referrals, and ongoing physical health support.",
    contact: "health@university.ac.uk",
    typicalWait: "1–3 working days",
    color: "teal",
  },
  general_advice: {
    id: "general_advice",
    name: "Student Services Hub",
    shortName: "Student Services",
    description:
      "General advice and signposting. If you're unsure where to turn, start here — we'll figure it out together.",
    contact: "studentservices@university.ac.uk",
    typicalWait: "Same day",
    color: "teal",
  },
};

// ---------------------------------------------------------------------------
// Routing table: (category, urgency) → department id
// ---------------------------------------------------------------------------
type RoutingKey = `${Category}:${UrgencyLevel}`;

const ROUTING_TABLE: Partial<Record<RoutingKey, string>> = {
  // Crisis — always crisis line regardless of category
  "crisis:crisis": "crisis_line",
  "mental_health:crisis": "crisis_line",
  "academic_stress:crisis": "crisis_line",
  "financial:crisis": "crisis_line",
  "housing:crisis": "crisis_line",
  "physical_health:crisis": "crisis_line",
  "social_isolation:crisis": "crisis_line",
  "general:crisis": "crisis_line",

  // Mental health
  "mental_health:high": "wellbeing",
  "mental_health:medium": "wellbeing",
  "mental_health:low": "wellbeing",

  // Social isolation → wellbeing
  "social_isolation:high": "wellbeing",
  "social_isolation:medium": "wellbeing",
  "social_isolation:low": "wellbeing",

  // Academic
  "academic_stress:high": "wellbeing",   // high academic stress → wellbeing first
  "academic_stress:medium": "academic_support",
  "academic_stress:low": "academic_support",

  // Financial
  "financial:high": "financial_aid",
  "financial:medium": "financial_aid",
  "financial:low": "financial_aid",

  // Housing
  "housing:high": "housing",
  "housing:medium": "housing",
  "housing:low": "housing",

  // Physical health
  "physical_health:high": "health_centre",
  "physical_health:medium": "health_centre",
  "physical_health:low": "health_centre",

  // General
  "general:high": "wellbeing",
  "general:medium": "general_advice",
  "general:low": "general_advice",
};

// ---------------------------------------------------------------------------
// Template-based explanation builder (no API key needed)
// ---------------------------------------------------------------------------
function buildTemplateExplanation(
  department: Department,
  category: Category,
  urgencyLevel: UrgencyLevel,
  matchedKeywords: MatchedKeyword[]
): string {
  const topWords = matchedKeywords
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((k) => k.word);

  const urgencyPhrase: Record<UrgencyLevel, string> = {
    low: "Your message suggests you could benefit from early support",
    medium: "Your message indicates you're under noticeable pressure",
    high: "Your message signals significant distress that warrants prompt attention",
    crisis: "Your message contains signals that need immediate attention",
  };

  const keywordPhrase =
    topWords.length > 0
      ? ` — your message mentioned ${topWords.join(", ")}`
      : "";

  return `${urgencyPhrase[urgencyLevel]}${keywordPhrase}. Routed to ${department.name}.`;
}

// ---------------------------------------------------------------------------
// Gemini explanation (optional, gracefully skipped if no key)
// ---------------------------------------------------------------------------
async function buildGeminiExplanation(
  department: Department,
  scoringResult: ScoringResult
): Promise<string | null> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) return null;

  const topWords = scoringResult.matchedKeywords
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map((k) => k.word)
    .join(", ");

  const prompt = `You are a campus support system. In one natural sentence (max 30 words), explain why a student was routed to "${department.name}". Their urgency level is "${scoringResult.urgencyLevel}" and key signals were: ${topWords || "general concern"}. Be warm and non-clinical.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 80, temperature: 0.4 },
        }),
      }
    );
    if (!response.ok) return null;
    const data = await response.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return text.trim() || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main routing function
// ---------------------------------------------------------------------------
export async function routeCase(
  scoringResult: ScoringResult
): Promise<RoutingResult> {
  const { primaryCategory, urgencyLevel, matchedKeywords, score, isCrisis } =
    scoringResult;

  const key: RoutingKey = `${primaryCategory}:${urgencyLevel}`;
  const deptId = ROUTING_TABLE[key] ?? "general_advice";
  const department = DEPARTMENTS[deptId];

  // Try Gemini, fall back to template
  const geminiExplanation = await buildGeminiExplanation(
    department,
    scoringResult
  );
  const explanation =
    geminiExplanation ??
    buildTemplateExplanation(
      department,
      primaryCategory,
      urgencyLevel,
      matchedKeywords
    );

  return {
    department,
    urgencyLevel,
    category: primaryCategory,
    explanation,
    score,
    matchedKeywords,
    isCrisis,
  };
}

// ---------------------------------------------------------------------------
// Segment splitter — turns intake text into consent-toggleable chunks
// ---------------------------------------------------------------------------
export function splitIntoSegments(text: string) {
  // Split on sentence boundaries; keep segments meaningful (≥10 chars)
  const raw = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);

  // If no sentence breaks, split on commas / line breaks
  const sentences =
    raw.length > 1
      ? raw
      : text
          .split(/[,\n]+/)
          .map((s) => s.trim())
          .filter((s) => s.length >= 3);

  const segments = sentences.length > 0 ? sentences : [text];

  return segments.map((seg, i) => ({
    id: `seg-${i}`,
    text: seg,
    included: true,
    isSensitive: isSensitivePhrase(seg),
  }));
}

const SENSITIVE_PATTERNS = [
  /suicid/i,
  /self.?harm/i,
  /overdos/i,
  /cutting/i,
  /medication/i,
  /disorder/i,
  /diagnosis/i,
  /diagnosed/i,
  /hospital/i,
  /therapy/i,
  /therapist/i,
  /abuse/i,
  /assault/i,
  /trauma/i,
];

function isSensitivePhrase(text: string): boolean {
  return SENSITIVE_PATTERNS.some((p) => p.test(text));
}
