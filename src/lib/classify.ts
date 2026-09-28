/**
 * Hybrid classifier pipeline: crisis rules → dictionary scoring → AI → human triage fallback.
 *
 * Pipeline order (authoritative):
 * 1. Normalize text
 * 2. Crisis phrases (lexicon) — if match: crisis path, AI never consulted to lower this
 * 3. Dictionary scoring (existing scoring.ts logic, expanded)
 * 4. Confidence check — high confidence → source="rules", done
 * 5. Low confidence → call AI (callModel)
 * 6. AI unavailable or confidence < 0.6 → human triage fallback
 */

import type { Category, ClassificationSource, MatchedKeyword, ScoringResult, UrgencyLevel } from "@/types";
import { CRISIS_PHRASES_LOWER } from "@/config/crisisLexicon";
import { callModel } from "./aiClient";

// ── Keyword rules (superset of original scoring.ts) ──────────────────────────

interface KeywordRule {
  word: string;
  weight: number;
  category: Category;
}

const KEYWORD_RULES: KeywordRule[] = [
  // Crisis handled by lexicon; retained here for weight accumulation only
  { word: "hopeless", weight: 5, category: "mental_health" },
  { word: "worthless", weight: 5, category: "mental_health" },
  { word: "nothing matters", weight: 6, category: "mental_health" },

  // Mental health
  { word: "anxiety", weight: 4, category: "mental_health" },
  { word: "anxious", weight: 4, category: "mental_health" },
  { word: "panic attack", weight: 6, category: "mental_health" },
  { word: "panic", weight: 5, category: "mental_health" },
  { word: "depression", weight: 5, category: "mental_health" },
  { word: "depressed", weight: 5, category: "mental_health" },
  { word: "overwhelmed", weight: 4, category: "mental_health" },
  { word: "can't cope", weight: 5, category: "mental_health" },
  { word: "cannot cope", weight: 5, category: "mental_health" },
  { word: "breaking down", weight: 5, category: "mental_health" },
  { word: "mental health", weight: 3, category: "mental_health" },
  { word: "therapist", weight: 3, category: "mental_health" },
  { word: "counseling", weight: 3, category: "mental_health" },
  { word: "counselling", weight: 3, category: "mental_health" },
  { word: "burnout", weight: 4, category: "mental_health" },
  { word: "burnt out", weight: 4, category: "mental_health" },
  { word: "not eating", weight: 4, category: "mental_health" },
  { word: "can't eat", weight: 4, category: "mental_health" },
  { word: "not sleeping", weight: 4, category: "mental_health" },
  { word: "can't sleep", weight: 4, category: "mental_health" },
  { word: "sleep difficulty", weight: 3, category: "mental_health" },
  { word: "insomnia", weight: 3, category: "mental_health" },
  { word: "crying", weight: 3, category: "mental_health" },
  { word: "stress", weight: 2, category: "mental_health" },
  { word: "stressed", weight: 2, category: "mental_health" },

  // Social isolation
  { word: "lonely", weight: 3, category: "social_isolation" },
  { word: "alone", weight: 2, category: "social_isolation" },
  { word: "isolated", weight: 3, category: "social_isolation" },
  { word: "no friends", weight: 3, category: "social_isolation" },
  { word: "disconnected", weight: 3, category: "social_isolation" },

  // Academic stress
  { word: "exam stress", weight: 4, category: "academic_stress" },
  { word: "exam", weight: 3, category: "academic_stress" },
  { word: "exams", weight: 3, category: "academic_stress" },
  { word: "failing", weight: 4, category: "academic_stress" },
  { word: "fail", weight: 3, category: "academic_stress" },
  { word: "failed", weight: 3, category: "academic_stress" },
  { word: "dissertation", weight: 3, category: "academic_stress" },
  { word: "thesis", weight: 3, category: "academic_stress" },
  { word: "deadline", weight: 3, category: "academic_stress" },
  { word: "assignment", weight: 2, category: "academic_stress" },
  { word: "grades", weight: 2, category: "academic_stress" },
  { word: "grade", weight: 2, category: "academic_stress" },
  { word: "professor", weight: 1, category: "academic_stress" },
  { word: "lecturer", weight: 1, category: "academic_stress" },
  { word: "extension", weight: 2, category: "academic_stress" },
  { word: "behind on work", weight: 3, category: "academic_stress" },
  { word: "dropped out", weight: 4, category: "academic_stress" },
  { word: "dropping out", weight: 4, category: "academic_stress" },
  { word: "withdrawal", weight: 3, category: "academic_stress" },
  { word: "attendance", weight: 2, category: "academic_stress" },
  { word: "can't focus", weight: 3, category: "academic_stress" },
  { word: "cannot focus", weight: 3, category: "academic_stress" },
  { word: "concentration", weight: 2, category: "academic_stress" },
  { word: "procrastinating", weight: 2, category: "academic_stress" },
  { word: "backlog", weight: 3, category: "academic_stress" },
  { word: "semester", weight: 1, category: "academic_stress" },
  { word: "hostel", weight: 1, category: "academic_stress" },

  // Financial
  { word: "money", weight: 2, category: "financial" },
  { word: "rent", weight: 3, category: "financial" },
  { word: "can't afford", weight: 4, category: "financial" },
  { word: "cannot afford", weight: 4, category: "financial" },
  { word: "debt", weight: 3, category: "financial" },
  { word: "loan", weight: 2, category: "financial" },
  { word: "financial", weight: 2, category: "financial" },
  { word: "broke", weight: 3, category: "financial" },
  { word: "food bank", weight: 4, category: "financial" },
  { word: "hungry", weight: 3, category: "financial" },
  { word: "bursary", weight: 2, category: "financial" },
  { word: "hardship", weight: 3, category: "financial" },
  { word: "scholarship", weight: 2, category: "financial" },
  { word: "stipend", weight: 2, category: "financial" },
  { word: "fees", weight: 2, category: "financial" },

  // Housing
  { word: "evicted", weight: 5, category: "housing" },
  { word: "eviction", weight: 5, category: "housing" },
  { word: "homeless", weight: 6, category: "housing" },
  { word: "no place to stay", weight: 6, category: "housing" },
  { word: "sofa surfing", weight: 5, category: "housing" },
  { word: "couch surfing", weight: 5, category: "housing" },
  { word: "accommodation", weight: 2, category: "housing" },
  { word: "housing", weight: 2, category: "housing" },
  { word: "hall", weight: 1, category: "housing" },

  // Physical health — EXPANDED
  { word: "health issues", weight: 3, category: "physical_health" },
  { word: "health problem", weight: 3, category: "physical_health" },
  { word: "illness", weight: 3, category: "physical_health" },
  { word: "medical", weight: 2, category: "physical_health" },
  { word: "sick", weight: 2, category: "physical_health" },
  { word: "ill", weight: 2, category: "physical_health" },
  { word: "injury", weight: 3, category: "physical_health" },
  { word: "hospital", weight: 4, category: "physical_health" },
  { word: "doctor", weight: 2, category: "physical_health" },
  { word: "chronic", weight: 3, category: "physical_health" },
  { word: "disability", weight: 3, category: "physical_health" },
  { word: "medication", weight: 2, category: "physical_health" },
  { word: "surgery", weight: 3, category: "physical_health" },
  { word: "treatment", weight: 2, category: "physical_health" },
];

// ── Negation check (simple — catches "I am NOT going to hurt myself") ──────────

const NEGATION_PREFIXES = [
  "not ", "don't ", "do not ", "didn't ", "did not ",
  "won't ", "will not ", "am not ", "i'm not ", "i am not ",
  "never ", "no longer ", "no intention",
];

/** Returns true if a crisis phrase appears preceded by a negation within 6 words */
function isNegated(text: string, phrase: string): boolean {
  const idx = text.indexOf(phrase);
  if (idx === -1) return false;
  // Look at the 50 chars before the phrase
  const before = text.slice(Math.max(0, idx - 50), idx).toLowerCase();
  return NEGATION_PREFIXES.some((neg) => before.includes(neg));
}

// ── Normalisation ─────────────────────────────────────────────────────────────

function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

// ── Confidence scoring ────────────────────────────────────────────────────────

const CONFIDENCE_THRESHOLD = 0.65;

function computeConfidence(
  totalScore: number,
  matchCount: number,
  categoryTotals: Partial<Record<Category, number>>
): number {
  if (totalScore === 0 || matchCount === 0) return 0;

  const sorted = Object.values(categoryTotals).sort(
    (a, b) => (b ?? 0) - (a ?? 0)
  ) as number[];

  const top = sorted[0] ?? 0;
  const second = sorted[1] ?? 0;
  const margin = top > 0 ? (top - second) / top : 0;

  // Composite: score weight + distinct match count + category margin
  const raw =
    Math.min(totalScore / 20, 1) * 0.5 +
    Math.min(matchCount / 5, 1) * 0.25 +
    margin * 0.25;

  return Math.min(raw, 1);
}

// ── Main classify function ────────────────────────────────────────────────────

export interface ClassifyResult extends ScoringResult {
  fromCache?: boolean;
}

export async function classifyText(text: string): Promise<ClassifyResult> {
  const lower = normalizeText(text);

  // ── Step 1: Crisis lexicon — authoritative, no AI can lower this ─────────
  const crisisMatch = CRISIS_PHRASES_LOWER.find(
    (phrase) => lower.includes(phrase) && !isNegated(lower, phrase)
  );

  if (crisisMatch) {
    return {
      score: 20,
      urgencyLevel: "crisis",
      primaryCategory: "crisis",
      secondaryCategory: null,
      matchedKeywords: [{ word: crisisMatch, weight: 10, category: "crisis" }],
      isCrisis: true,
      source: "rules",
      evidencePhrases: [crisisMatch],
      needsHumanTriage: false,
    };
  }

  // ── Step 2: Dictionary scoring (KEYWORD_RULES + localStorage admin overrides) ──
  // Load admin-added phrases from the dictionary override panel
  const overrideRules: KeywordRule[] = (() => {
    try {
      const raw = localStorage.getItem("campusreach_dict_overrides");
      if (!raw) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: any[] = JSON.parse(raw);
      return items
        .filter((o) => typeof o.phrase === "string" && typeof o.suggestedCategory === "string")
        .map((o) => ({
          word: o.phrase.toLowerCase().trim(),
          weight: 3, // conservative default weight for user-added phrases
          category: o.suggestedCategory as Category,
        }));
    } catch {
      return [];
    }
  })();

  const matched: MatchedKeyword[] = [];
  const seenWords = new Set<string>();

  for (const rule of [...KEYWORD_RULES, ...overrideRules]) {
    if (lower.includes(rule.word) && !seenWords.has(rule.word)) {
      seenWords.add(rule.word);
      matched.push({ word: rule.word, weight: rule.weight, category: rule.category });
    }
  }

  // Dedup: if a phrase subsumes a sub-phrase with equal weight, keep the phrase
  const deduplicated = matched.filter((m) => {
    return !matched.some(
      (other) =>
        other.word !== m.word &&
        other.word.includes(m.word) &&
        other.weight >= m.weight
    );
  });

  const totalScore = deduplicated.reduce((sum, m) => sum + m.weight, 0);

  const categoryTotals: Partial<Record<Category, number>> = {};
  for (const m of deduplicated) {
    categoryTotals[m.category] = (categoryTotals[m.category] ?? 0) + m.weight;
  }

  const sortedCats = Object.entries(categoryTotals).sort(
    ([, a], [, b]) => (b ?? 0) - (a ?? 0)
  );

  const primaryCategory = (sortedCats[0]?.[0] as Category) ?? "general";
  const secondaryCategory = (sortedCats[1]?.[0] as Category) ?? null;

  let urgencyLevel: UrgencyLevel =
    totalScore >= 12 ? "high" : totalScore >= 5 ? "medium" : "low";

  const confidence = computeConfidence(
    totalScore,
    deduplicated.length,
    categoryTotals
  );

  const evidencePhrases = deduplicated
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map((m) => m.word);

  // ── Step 3: High-confidence rules path ───────────────────────────────────
  if (confidence >= CONFIDENCE_THRESHOLD && totalScore >= 3) {
    return {
      score: totalScore,
      urgencyLevel,
      primaryCategory,
      secondaryCategory,
      matchedKeywords: deduplicated,
      isCrisis: false,
      source: "rules",
      evidencePhrases,
      needsHumanTriage: false,
    };
  }

  // ── Step 4: Try AI ────────────────────────────────────────────────────────
  const aiResult = await callModel({ text, existingScore: totalScore });

  if (aiResult) {
    // AI may only escalate
    const aiUrgencyNums: Record<UrgencyLevel, number> = {
      low: 0, medium: 1, high: 2, crisis: 3,
    };
    const urgencyNums: Record<UrgencyLevel, number> = {
      low: 0, medium: 1, high: 2, crisis: 3,
    };
    const finalUrgency =
      aiUrgencyNums[aiResult.urgencyLevel] > urgencyNums[urgencyLevel]
        ? aiResult.urgencyLevel
        : urgencyLevel;

    const finalCrisis = aiResult.crisisSignal;

    return {
      score: totalScore,
      urgencyLevel: finalCrisis ? "crisis" : finalUrgency,
      primaryCategory: aiResult.primaryCategory,
      secondaryCategory: aiResult.secondaryCategory,
      matchedKeywords: deduplicated,
      isCrisis: finalCrisis,
      source: aiResult.fromCache ? "ai_cached" : "ai",
      aiConfidence: aiResult.confidence,
      evidencePhrases: aiResult.evidencePhrases.length
        ? aiResult.evidencePhrases
        : evidencePhrases,
      needsHumanTriage: false,
    };
  }

  // ── Step 5: Human triage fallback ─────────────────────────────────────────
  // AI unavailable or confidence < 0.6 — don't guess a specialist
  return {
    score: totalScore,
    urgencyLevel: urgencyLevel === "low" ? "medium" : urgencyLevel, // nudge up if unknown
    primaryCategory: primaryCategory === "general" ? "general" : primaryCategory,
    secondaryCategory,
    matchedKeywords: deduplicated,
    isCrisis: false,
    source: "human",
    evidencePhrases,
    needsHumanTriage: true,
  };
}
