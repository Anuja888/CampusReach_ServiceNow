/**
 * Department routing logic.
 * Maps (category × urgency) → department + explanation sentence.
 * Explanation uses Gemini for the human-readable sentence only (not classification).
 * Falls back to template sentence if no API key.
 */

import type {
  Category,
  ClassificationSource,
  Department,
  MatchedKeyword,
  RoutingResult,
  ScoringResult,
  UrgencyLevel,
} from "@/types";

// ── Department catalogue ───────────────────────────────────────────────────────

export const DEPARTMENTS: Record<string, Department> = {
  crisis_line: {
    id: "crisis_line",
    name: "Crisis Support Line",
    shortName: "Crisis Line",
    description:
      "Immediate 24/7 support for students in acute distress. A trained counsellor will answer within minutes.",
    contact: "Tele-MANAS 14416 / 1-800-891-4416 (24×7)",
    typicalWait: "< 5 minutes",
    color: "crisis",
  },
  wellbeing: {
    id: "wellbeing",
    name: "Student Wellbeing Service",
    shortName: "Wellbeing",
    description:
      "Counselling, mental health support, and emotional wellbeing. First appointments within 3 working days.",
    contact: "wellbeing@university.edu",
    typicalWait: "2–3 working days",
    color: "teal",
  },
  academic_support: {
    id: "academic_support",
    name: "Academic Support & Advising",
    shortName: "Academic Support",
    description:
      "Deadline extensions, mitigating circumstances, study skills coaching, and tutor referrals.",
    contact: "academic.support@university.edu",
    typicalWait: "Same day response",
    color: "teal",
  },
  financial_aid: {
    id: "financial_aid",
    name: "Financial Aid & Hardship Fund",
    shortName: "Financial Aid",
    description:
      "Emergency bursaries, hardship grants, debt advice, and help navigating student finance.",
    contact: "financialaid@university.edu",
    typicalWait: "1–2 working days",
    color: "teal",
  },
  housing: {
    id: "housing",
    name: "Student Housing & Accommodation",
    shortName: "Housing",
    description:
      "Emergency accommodation, tenancy disputes, and connections to local housing support.",
    contact: "housing@university.edu",
    typicalWait: "Same day for emergencies",
    color: "teal",
  },
  health_centre: {
    id: "health_centre",
    name: "Campus Health Centre",
    shortName: "Health Centre",
    description:
      "GP and nursing appointments, referrals, and ongoing physical health support.",
    contact: "health@university.edu",
    typicalWait: "1–3 working days",
    color: "teal",
  },
  general_advice: {
    id: "general_advice",
    name: "Student Services Hub",
    shortName: "Student Services",
    description:
      "General advice and signposting. If you're unsure where to turn, start here — we'll figure it out together.",
    contact: "studentservices@university.edu",
    typicalWait: "Same day",
    color: "teal",
  },
  // NEW — human triage fallback
  human_triage: {
    id: "human_triage",
    name: "Student Support Front Desk (Human Triage)",
    shortName: "Front Desk",
    description:
      "A member of our team will personally review your message and connect you with the right support. No automated guess.",
    contact: "support@university.edu",
    typicalWait: "Within 2 hours",
    color: "teal",
  },
};

// ── Routing table ──────────────────────────────────────────────────────────────

type RoutingKey = `${Category}:${UrgencyLevel}`;

const ROUTING_TABLE: Partial<Record<RoutingKey, string>> = {
  "crisis:crisis": "crisis_line",
  "mental_health:crisis": "crisis_line",
  "academic_stress:crisis": "crisis_line",
  "financial:crisis": "crisis_line",
  "housing:crisis": "crisis_line",
  "physical_health:crisis": "crisis_line",
  "social_isolation:crisis": "crisis_line",
  "general:crisis": "crisis_line",

  "mental_health:high": "wellbeing",
  "mental_health:medium": "wellbeing",
  "mental_health:low": "wellbeing",

  "social_isolation:high": "wellbeing",
  "social_isolation:medium": "wellbeing",
  "social_isolation:low": "wellbeing",

  "academic_stress:high": "wellbeing",
  "academic_stress:medium": "academic_support",
  "academic_stress:low": "academic_support",

  "financial:high": "financial_aid",
  "financial:medium": "financial_aid",
  "financial:low": "financial_aid",

  "housing:high": "housing",
  "housing:medium": "housing",
  "housing:low": "housing",

  "physical_health:high": "health_centre",
  "physical_health:medium": "health_centre",
  "physical_health:low": "health_centre",

  "general:high": "wellbeing",
  "general:medium": "general_advice",
  "general:low": "general_advice",
};

// ── Template explanation ───────────────────────────────────────────────────────

function buildTemplateExplanation(
  department: Department,
  category: Category,
  urgencyLevel: UrgencyLevel,
  evidencePhrases: string[],
  source: ClassificationSource,
  needsHumanTriage: boolean
): string {
  if (needsHumanTriage) {
    return `We're not sure yet — a person will review this and connect you with the right team. No automated guess has been made.`;
  }

  const urgencyPhrase: Record<UrgencyLevel, string> = {
    low: "Your message suggests you could benefit from early support",
    medium: "Your message indicates you're under noticeable pressure",
    high: "Your message signals significant distress that warrants prompt attention",
    crisis: "Your message contains signals that need immediate attention",
  };

  const topWords = evidencePhrases.slice(0, 3);
  const keywordPhrase =
    topWords.length > 0 ? ` — your message mentioned ${topWords.join(", ")}` : "";

  const sourceNote =
    source === "ai" || source === "ai_cached"
      ? " (AI-assisted classification)"
      : "";

  return `${urgencyPhrase[urgencyLevel]}${keywordPhrase}${sourceNote}. Routed to ${department.name}.`;
}

// ── Gemini explanation for the result sentence only ────────────────────────────

async function buildGeminiExplanation(
  department: Department,
  scoringResult: ScoringResult
): Promise<string | null> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) return null;
  if (scoringResult.needsHumanTriage) return null;

  const topWords = scoringResult.evidencePhrases.slice(0, 5).join(", ");

  const prompt = `You are a campus support system. In one warm, non-clinical sentence (max 30 words), explain why a student was routed to "${department.name}". Urgency: "${scoringResult.urgencyLevel}". Key signals: ${topWords || "general concern"}.`;

  try {
    const resp = await fetch(
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
    if (!resp.ok) return null;
    const data = await resp.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return text.trim() || null;
  } catch {
    return null;
  }
}

// ── Main routing function ──────────────────────────────────────────────────────

export async function routeCase(
  scoringResult: ScoringResult
): Promise<RoutingResult> {
  const {
    primaryCategory,
    urgencyLevel,
    matchedKeywords,
    score,
    isCrisis,
    source,
    aiConfidence,
    evidencePhrases,
    secondaryCategory,
    needsHumanTriage,
  } = scoringResult;

  // Human triage bypass
  if (needsHumanTriage) {
    const department = DEPARTMENTS["human_triage"];
    return {
      department,
      urgencyLevel,
      category: primaryCategory,
      secondaryCategory,
      explanation: buildTemplateExplanation(
        department, primaryCategory, urgencyLevel, evidencePhrases, source, true
      ),
      score,
      matchedKeywords,
      isCrisis: false,
      source,
      aiConfidence,
      evidencePhrases,
      needsHumanTriage: true,
    };
  }

  const key: RoutingKey = `${primaryCategory}:${urgencyLevel}`;
  const deptId = ROUTING_TABLE[key] ?? "general_advice";
  const department = DEPARTMENTS[deptId];

  const geminiExplanation = await buildGeminiExplanation(department, scoringResult);
  const explanation =
    geminiExplanation ??
    buildTemplateExplanation(
      department, primaryCategory, urgencyLevel, evidencePhrases, source, false
    );

  return {
    department,
    urgencyLevel,
    category: primaryCategory,
    secondaryCategory,
    explanation,
    score,
    matchedKeywords,
    isCrisis,
    source,
    aiConfidence,
    evidencePhrases,
    needsHumanTriage: false,
  };
}

// ── Segment splitter (unchanged) ───────────────────────────────────────────────

export function splitIntoSegments(text: string) {
  const raw = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);

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
  /suicid/i, /self.?harm/i, /overdos/i, /cutting/i,
  /medication/i, /disorder/i, /diagnosis/i, /diagnosed/i,
  /hospital/i, /therapy/i, /therapist/i, /abuse/i,
  /assault/i, /trauma/i,
];

function isSensitivePhrase(text: string): boolean {
  return SENSITIVE_PATTERNS.some((p) => p.test(text));
}
