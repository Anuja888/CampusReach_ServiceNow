/**
 * Rule-based urgency scoring engine.
 * Transparent keyword/weight approach — no ML, fully explainable.
 * Every routing decision can be traced back to specific matched words.
 */

import type {
  Category,
  MatchedKeyword,
  ScoringResult,
  UrgencyLevel,
} from "@/types";

interface KeywordRule {
  word: string;
  weight: number;
  category: Category;
}

// ---------------------------------------------------------------------------
// Keyword rule table — the single source of truth for scoring decisions
// ---------------------------------------------------------------------------
const KEYWORD_RULES: KeywordRule[] = [
  // ── Crisis signals (weight 10) — any single match → crisis threshold ──
  { word: "suicide", weight: 10, category: "crisis" },
  { word: "suicidal", weight: 10, category: "crisis" },
  { word: "kill myself", weight: 10, category: "crisis" },
  { word: "end my life", weight: 10, category: "crisis" },
  { word: "don't want to be here", weight: 10, category: "crisis" },
  { word: "don't want to live", weight: 10, category: "crisis" },
  { word: "no reason to live", weight: 10, category: "crisis" },
  { word: "self harm", weight: 9, category: "crisis" },
  { word: "self-harm", weight: 9, category: "crisis" },
  { word: "cutting myself", weight: 9, category: "crisis" },
  { word: "hurting myself", weight: 8, category: "crisis" },
  { word: "overdose", weight: 9, category: "crisis" },
  { word: "can't go on", weight: 8, category: "crisis" },
  { word: "cannot go on", weight: 8, category: "crisis" },
  { word: "nothing matters", weight: 6, category: "crisis" },
  { word: "hopeless", weight: 5, category: "mental_health" },
  { word: "worthless", weight: 5, category: "mental_health" },

  // ── Mental health / wellbeing (weight 3-6) ──
  { word: "anxiety", weight: 4, category: "mental_health" },
  { word: "anxious", weight: 4, category: "mental_health" },
  { word: "panic", weight: 5, category: "mental_health" },
  { word: "panic attack", weight: 6, category: "mental_health" },
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
  { word: "lonely", weight: 3, category: "social_isolation" },
  { word: "alone", weight: 2, category: "social_isolation" },
  { word: "isolated", weight: 3, category: "social_isolation" },
  { word: "no friends", weight: 3, category: "social_isolation" },
  { word: "disconnected", weight: 3, category: "social_isolation" },

  // ── Academic stress (weight 2-5) ──
  { word: "exam", weight: 3, category: "academic_stress" },
  { word: "exams", weight: 3, category: "academic_stress" },
  { word: "exam stress", weight: 4, category: "academic_stress" },
  { word: "failing", weight: 4, category: "academic_stress" },
  { word: "fail", weight: 3, category: "academic_stress" },
  { word: "dissertation", weight: 3, category: "academic_stress" },
  { word: "thesis", weight: 3, category: "academic_stress" },
  { word: "deadline", weight: 3, category: "academic_stress" },
  { word: "assignment", weight: 2, category: "academic_stress" },
  { word: "grades", weight: 2, category: "academic_stress" },
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

  // ── Financial (weight 2-4) ──
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

  // ── Housing (weight 2-4) ──
  { word: "housing", weight: 2, category: "housing" },
  { word: "evicted", weight: 5, category: "housing" },
  { word: "eviction", weight: 5, category: "housing" },
  { word: "homeless", weight: 6, category: "housing" },
  { word: "no place to stay", weight: 6, category: "housing" },
  { word: "sofa surfing", weight: 5, category: "housing" },
  { word: "couch surfing", weight: 5, category: "housing" },
  { word: "accommodation", weight: 2, category: "housing" },
  { word: "hall", weight: 1, category: "housing" },

  // ── Physical health (weight 2-4) ──
  { word: "sick", weight: 2, category: "physical_health" },
  { word: "ill", weight: 2, category: "physical_health" },
  { word: "injury", weight: 3, category: "physical_health" },
  { word: "hospital", weight: 4, category: "physical_health" },
  { word: "doctor", weight: 2, category: "physical_health" },
  { word: "chronic", weight: 3, category: "physical_health" },
  { word: "disability", weight: 3, category: "physical_health" },
  { word: "medication", weight: 2, category: "physical_health" },
];

// ---------------------------------------------------------------------------
// Urgency thresholds
// ---------------------------------------------------------------------------
const THRESHOLDS = {
  crisis: 8,   // any crisis-category keyword ≥ 8, OR total score ≥ 8
  high: 12,    // total score
  medium: 5,   // total score
};

// ---------------------------------------------------------------------------
// Scorer
// ---------------------------------------------------------------------------
export function scoreText(text: string): ScoringResult {
  const lower = text.toLowerCase();

  const matched: MatchedKeyword[] = [];
  const seenWords = new Set<string>();

  for (const rule of KEYWORD_RULES) {
    if (lower.includes(rule.word) && !seenWords.has(rule.word)) {
      seenWords.add(rule.word);
      matched.push({ word: rule.word, weight: rule.weight, category: rule.category });
    }
  }

  // Deduplicate: if a phrase matches (e.g. "panic attack") remove subsets ("panic")
  const deduplicated = matched.filter((m) => {
    return !matched.some(
      (other) =>
        other.word !== m.word &&
        other.word.includes(m.word) &&
        other.weight >= m.weight
    );
  });

  const totalScore = deduplicated.reduce((sum, m) => sum + m.weight, 0);

  // Check for any single high-weight crisis keyword
  const maxSingleWeight = deduplicated.reduce(
    (max, m) => Math.max(max, m.weight),
    0
  );
  const hasCrisisCategory = deduplicated.some(
    (m) => m.category === "crisis"
  );

  const isCrisis =
    hasCrisisCategory ||
    maxSingleWeight >= THRESHOLDS.crisis ||
    totalScore >= 18;

  let urgencyLevel: UrgencyLevel;
  if (isCrisis) {
    urgencyLevel = "crisis";
  } else if (totalScore >= THRESHOLDS.high) {
    urgencyLevel = "high";
  } else if (totalScore >= THRESHOLDS.medium) {
    urgencyLevel = "medium";
  } else {
    urgencyLevel = "low";
  }

  // Primary category = highest cumulative weight
  const categoryTotals: Partial<Record<Category, number>> = {};
  for (const m of deduplicated) {
    categoryTotals[m.category] = (categoryTotals[m.category] ?? 0) + m.weight;
  }

  if (isCrisis) {
    const primaryCategory: Category = "crisis";
    return {
      score: totalScore,
      urgencyLevel,
      primaryCategory,
      secondaryCategory: null,
      matchedKeywords: deduplicated,
      isCrisis: true,
      source: "rules" as const,
      evidencePhrases: deduplicated.slice(0, 5).map((m) => m.word),
      needsHumanTriage: false,
    };
  }

  const primaryCategory =
    (Object.entries(categoryTotals).sort(
      ([, a], [, b]) => (b ?? 0) - (a ?? 0)
    )[0]?.[0] as Category) ?? "general";

  return {
    score: totalScore,
    urgencyLevel,
    primaryCategory,
    secondaryCategory: null,
    matchedKeywords: deduplicated,
    isCrisis: false,
    source: "rules" as const,
    evidencePhrases: deduplicated.slice(0, 5).map((m) => m.word),
    needsHumanTriage: false,
  };
}

export function getUrgencyLabel(level: UrgencyLevel): string {
  const labels: Record<UrgencyLevel, string> = {
    low: "Low priority",
    medium: "Medium priority",
    high: "High priority",
    crisis: "Crisis — immediate help",
  };
  return labels[level];
}
