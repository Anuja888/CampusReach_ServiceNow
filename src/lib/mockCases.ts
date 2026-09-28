/**
 * Seeded mock cases for the staff queue demo.
 * These live outside store.ts so the real data layer is untouched.
 * Sorted by urgency weight at source so the queue can just render them.
 */

import type { CaseRecord } from "@/types";
import { DEPARTMENTS } from "./routing";

// Stable timestamps relative to "now" so they look live during a demo
function minsAgo(n: number): string {
  return new Date(Date.now() - n * 60 * 1000).toISOString();
}

export const MOCK_CASES: CaseRecord[] = [
  // ── Crisis ───────────────────────────────────────────────────────────────
  {
    id: "mock-001",
    createdAt: minsAgo(4),
    submitted: true,
    intakeData: {
      mainText:
        "I don't want to be here anymore. I've been thinking about hurting myself and I can't see a way out. I haven't left my room in three days.",
      contextText: "3rd year, halls of residence.",
    },
    scoringResult: {
      score: 19,
      urgencyLevel: "crisis",
      primaryCategory: "crisis",
      isCrisis: true,
      matchedKeywords: [
        { word: "hurting myself", weight: 8, category: "crisis" },
        { word: "don't want to be here", weight: 10, category: "crisis" },
        { word: "overwhelmed", weight: 4, category: "mental_health" },
      ],
    },
    routingResult: {
      department: DEPARTMENTS["crisis_line"],
      urgencyLevel: "crisis",
      category: "crisis",
      explanation:
        "Your message contained signals that need immediate attention — your message mentioned hurting myself, don't want to be here. Routed to Crisis Support Line.",
      score: 19,
      isCrisis: true,
      matchedKeywords: [
        { word: "hurting myself", weight: 8, category: "crisis" },
        { word: "don't want to be here", weight: 10, category: "crisis" },
      ],
    },
    segments: [
      {
        id: "seg-0",
        text: "I don't want to be here anymore.",
        included: true,
        isSensitive: false,
      },
      {
        id: "seg-1",
        text: "I've been thinking about hurting myself and I can't see a way out.",
        included: true,
        isSensitive: true,
      },
      {
        id: "seg-2",
        text: "I haven't left my room in three days.",
        included: true,
        isSensitive: false,
      },
    ],
  },

  // ── High ─────────────────────────────────────────────────────────────────
  {
    id: "mock-002",
    createdAt: minsAgo(17),
    submitted: true,
    intakeData: {
      mainText:
        "I've been having panic attacks every day for the past two weeks. I can't sleep and I can't focus on anything. My dissertation is due in ten days and I feel like I'm breaking down.",
      contextText: "Final year MSc, international student.",
    },
    scoringResult: {
      score: 14,
      urgencyLevel: "high",
      primaryCategory: "mental_health",
      isCrisis: false,
      matchedKeywords: [
        { word: "panic attack", weight: 6, category: "mental_health" },
        { word: "can't sleep", weight: 4, category: "mental_health" },
        { word: "breaking down", weight: 5, category: "mental_health" },
        { word: "dissertation", weight: 3, category: "academic_stress" },
      ],
    },
    routingResult: {
      department: DEPARTMENTS["wellbeing"],
      urgencyLevel: "high",
      category: "mental_health",
      explanation:
        "Your message signals significant distress — your message mentioned panic attack, can't sleep, breaking down. Routed to Student Wellbeing Service.",
      score: 14,
      isCrisis: false,
      matchedKeywords: [
        { word: "panic attack", weight: 6, category: "mental_health" },
        { word: "can't sleep", weight: 4, category: "mental_health" },
        { word: "breaking down", weight: 5, category: "mental_health" },
        { word: "dissertation", weight: 3, category: "academic_stress" },
      ],
    },
    segments: [
      {
        id: "seg-0",
        text: "I've been having panic attacks every day for the past two weeks.",
        included: true,
        isSensitive: false,
      },
      {
        id: "seg-1",
        text: "I can't sleep and I can't focus on anything.",
        included: true,
        isSensitive: false,
      },
      {
        id: "seg-2",
        text: "My dissertation is due in ten days and I feel like I'm breaking down.",
        included: true,
        isSensitive: false,
      },
    ],
  },

  // ── High ─────────────────────────────────────────────────────────────────
  {
    id: "mock-003",
    createdAt: minsAgo(31),
    submitted: true,
    intakeData: {
      mainText:
        "I'm about to be evicted from my private flat. My landlord has given me one week. I have nowhere to go and I can't afford a deposit anywhere. I'm completely overwhelmed.",
      contextText: "2nd year, estranged from family.",
    },
    scoringResult: {
      score: 13,
      urgencyLevel: "high",
      primaryCategory: "housing",
      isCrisis: false,
      matchedKeywords: [
        { word: "evicted", weight: 5, category: "housing" },
        { word: "can't afford", weight: 4, category: "financial" },
        { word: "overwhelmed", weight: 4, category: "mental_health" },
      ],
    },
    routingResult: {
      department: DEPARTMENTS["housing"],
      urgencyLevel: "high",
      category: "housing",
      explanation:
        "Your message signals significant distress — your message mentioned evicted, can't afford. Routed to Student Housing & Accommodation.",
      score: 13,
      isCrisis: false,
      matchedKeywords: [
        { word: "evicted", weight: 5, category: "housing" },
        { word: "can't afford", weight: 4, category: "financial" },
        { word: "overwhelmed", weight: 4, category: "mental_health" },
      ],
    },
    segments: [
      {
        id: "seg-0",
        text: "I'm about to be evicted from my private flat.",
        included: true,
        isSensitive: false,
      },
      {
        id: "seg-1",
        text: "My landlord has given me one week.",
        included: true,
        isSensitive: false,
      },
      {
        id: "seg-2",
        text: "I have nowhere to go and I can't afford a deposit anywhere.",
        included: true,
        isSensitive: false,
      },
    ],
  },

  // ── Medium ────────────────────────────────────────────────────────────────
  {
    id: "mock-004",
    createdAt: minsAgo(52),
    submitted: true,
    intakeData: {
      mainText:
        "My exam is tomorrow and I've been struggling to revise because of anxiety. I've been really stressed and can't focus. I keep putting it off.",
      contextText: "1st year undergrad.",
    },
    scoringResult: {
      score: 9,
      urgencyLevel: "medium",
      primaryCategory: "academic_stress",
      isCrisis: false,
      matchedKeywords: [
        { word: "exam", weight: 3, category: "academic_stress" },
        { word: "anxiety", weight: 4, category: "mental_health" },
        { word: "can't focus", weight: 3, category: "academic_stress" },
      ],
    },
    routingResult: {
      department: DEPARTMENTS["academic_support"],
      urgencyLevel: "medium",
      category: "academic_stress",
      explanation:
        "Your message indicates you're under noticeable pressure — your message mentioned exam, anxiety, can't focus. Routed to Academic Support & Advising.",
      score: 9,
      isCrisis: false,
      matchedKeywords: [
        { word: "exam", weight: 3, category: "academic_stress" },
        { word: "anxiety", weight: 4, category: "mental_health" },
        { word: "can't focus", weight: 3, category: "academic_stress" },
      ],
    },
    segments: [
      {
        id: "seg-0",
        text: "My exam is tomorrow and I've been struggling to revise because of anxiety.",
        included: true,
        isSensitive: false,
      },
      {
        id: "seg-1",
        text: "I've been really stressed and can't focus.",
        included: false,
        isSensitive: false,
      },
      {
        id: "seg-2",
        text: "I keep putting it off.",
        included: true,
        isSensitive: false,
      },
    ],
  },

  // ── Medium ────────────────────────────────────────────────────────────────
  {
    id: "mock-005",
    createdAt: minsAgo(78),
    submitted: true,
    intakeData: {
      mainText:
        "I've run out of money before the end of term. I can't pay my rent this month and I'm eating very little. I don't want to ask my parents.",
      contextText: "Part-time student, works 20 hrs/week.",
    },
    scoringResult: {
      score: 8,
      urgencyLevel: "medium",
      primaryCategory: "financial",
      isCrisis: false,
      matchedKeywords: [
        { word: "rent", weight: 3, category: "financial" },
        { word: "money", weight: 2, category: "financial" },
        { word: "hungry", weight: 3, category: "financial" },
      ],
    },
    routingResult: {
      department: DEPARTMENTS["financial_aid"],
      urgencyLevel: "medium",
      category: "financial",
      explanation:
        "Your message indicates you're under noticeable pressure — your message mentioned rent, money. Routed to Financial Aid & Hardship Fund.",
      score: 8,
      isCrisis: false,
      matchedKeywords: [
        { word: "rent", weight: 3, category: "financial" },
        { word: "money", weight: 2, category: "financial" },
        { word: "hungry", weight: 3, category: "financial" },
      ],
    },
    segments: [
      {
        id: "seg-0",
        text: "I've run out of money before the end of term.",
        included: true,
        isSensitive: false,
      },
      {
        id: "seg-1",
        text: "I can't pay my rent this month and I'm eating very little.",
        included: true,
        isSensitive: false,
      },
      {
        id: "seg-2",
        text: "I don't want to ask my parents.",
        included: false,
        isSensitive: false,
      },
    ],
  },

  // ── Low ───────────────────────────────────────────────────────────────────
  {
    id: "mock-006",
    createdAt: minsAgo(140),
    submitted: true,
    intakeData: {
      mainText:
        "I've been feeling a bit lonely since starting university. It's hard to make friends and I feel disconnected from my course. Not sure who to talk to about it.",
      contextText: "1st year, commuter student.",
    },
    scoringResult: {
      score: 4,
      urgencyLevel: "low",
      primaryCategory: "social_isolation",
      isCrisis: false,
      matchedKeywords: [
        { word: "lonely", weight: 3, category: "social_isolation" },
        { word: "disconnected", weight: 3, category: "social_isolation" },
      ],
    },
    routingResult: {
      department: DEPARTMENTS["wellbeing"],
      urgencyLevel: "low",
      category: "social_isolation",
      explanation:
        "Your message suggests you could benefit from early support — your message mentioned lonely, disconnected. Routed to Student Wellbeing Service.",
      score: 4,
      isCrisis: false,
      matchedKeywords: [
        { word: "lonely", weight: 3, category: "social_isolation" },
        { word: "disconnected", weight: 3, category: "social_isolation" },
      ],
    },
    segments: [
      {
        id: "seg-0",
        text: "I've been feeling a bit lonely since starting university.",
        included: true,
        isSensitive: false,
      },
      {
        id: "seg-1",
        text: "It's hard to make friends and I feel disconnected from my course.",
        included: true,
        isSensitive: false,
      },
      {
        id: "seg-2",
        text: "Not sure who to talk to about it.",
        included: true,
        isSensitive: false,
      },
    ],
  },
];

/** Urgency sort order — crisis first */
const URGENCY_ORDER: Record<string, number> = {
  crisis: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function getSortedMockCases(): CaseRecord[] {
  return [...MOCK_CASES].sort(
    (a, b) =>
      URGENCY_ORDER[a.routingResult.urgencyLevel] -
      URGENCY_ORDER[b.routingResult.urgencyLevel]
  );
}

/** Student display label — initials + case suffix, no full names */
export function getCaseLabel(caseRecord: CaseRecord): string {
  return `Case #${caseRecord.id.slice(-3).toUpperCase()}`;
}
