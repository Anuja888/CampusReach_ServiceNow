/**
 * Seeded mock cases — v2 shape, Indian campus context.
 * Used by StaffQueue and demo reset.
 */

import type { CaseRecord } from "@/types";
import { DEPARTMENTS } from "./routing";

const SLOTS = [
  { id: "slot-1", label: "Mon 28 Oct, 10:00–10:30", available: true },
  { id: "slot-2", label: "Tue 29 Oct, 14:00–14:30", available: true },
  { id: "slot-3", label: "Wed 30 Oct, 11:00–11:30", available: true },
];

function minsAgo(n: number): string {
  return new Date(Date.now() - n * 60 * 1000).toISOString();
}

/** Shared defaults for all new fields added in v2 */
const BASE: Pick<
  CaseRecord,
  | "studentId" | "studentName" | "status" | "assignedTo" | "assignedDepartmentId"
  | "events" | "notes" | "appointmentSlots" | "offeredAppointment"
  | "routingFeedback" | "revokedAt" | "acknowledgedAt"
> = {
  studentId: null,
  studentName: null,
  status: "submitted",
  assignedTo: null,
  assignedDepartmentId: null,
  events: [],
  notes: [],
  appointmentSlots: SLOTS,
  offeredAppointment: null,
  routingFeedback: null,
  revokedAt: null,
  acknowledgedAt: null,
};

/** Riya's two existing requests so My Requests is never empty */
const RIYA_ID = "STU2024001";

export const MOCK_CASES: CaseRecord[] = [
  // ── Crisis ────────────────────────────────────────────────────────────────
  {
    ...BASE,
    _v: 2,
    id: "mock-001",
    createdAt: minsAgo(4),
    submitted: true,
    intakeData: {
      mainText: "I don't want to be here anymore. I've been thinking about hurting myself and I can't see a way out. I haven't left my room in three days.",
      contextText: "3rd year, halls of residence.",
    },
    scoringResult: {
      score: 19,
      urgencyLevel: "crisis",
      primaryCategory: "crisis",
      secondaryCategory: "mental_health",
      isCrisis: true,
      source: "rules",
      evidencePhrases: ["hurting myself", "don't want to be here"],
      needsHumanTriage: false,
      matchedKeywords: [
        { word: "hurting myself", weight: 8, category: "crisis" },
        { word: "don't want to be here", weight: 10, category: "crisis" },
      ],
    },
    routingResult: {
      department: DEPARTMENTS["crisis_line"],
      urgencyLevel: "crisis",
      category: "crisis",
      secondaryCategory: "mental_health",
      explanation: "Your message contained signals that need immediate attention — hurting myself, don't want to be here. Routed to Crisis Support Line.",
      score: 19,
      isCrisis: true,
      source: "rules",
      evidencePhrases: ["hurting myself", "don't want to be here"],
      needsHumanTriage: false,
      matchedKeywords: [
        { word: "hurting myself", weight: 8, category: "crisis" },
        { word: "don't want to be here", weight: 10, category: "crisis" },
      ],
    },
    segments: [
      { id: "seg-0", text: "I don't want to be here anymore.", included: true, isSensitive: false },
      { id: "seg-1", text: "I've been thinking about hurting myself and I can't see a way out.", included: true, isSensitive: true },
      { id: "seg-2", text: "I haven't left my room in three days.", included: true, isSensitive: false },
    ],
  },

  // ── High — panic + dissertation ───────────────────────────────────────────
  {
    ...BASE,
    _v: 2,
    id: "mock-002",
    createdAt: minsAgo(17),
    submitted: true,
    intakeData: {
      mainText: "I've been having panic attacks every day for the past two weeks. I can't sleep and I can't focus on anything. My dissertation is due in ten days and I feel like I'm breaking down.",
      contextText: "Final year MSc, international student.",
    },
    scoringResult: {
      score: 14,
      urgencyLevel: "high",
      primaryCategory: "mental_health",
      secondaryCategory: "academic_stress",
      isCrisis: false,
      source: "rules",
      evidencePhrases: ["panic attack", "can't sleep", "breaking down", "dissertation"],
      needsHumanTriage: false,
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
      secondaryCategory: "academic_stress",
      explanation: "Your message signals significant distress — panic attack, can't sleep, breaking down. Routed to Student Wellbeing Service.",
      score: 14,
      isCrisis: false,
      source: "rules",
      evidencePhrases: ["panic attack", "can't sleep", "breaking down"],
      needsHumanTriage: false,
      matchedKeywords: [
        { word: "panic attack", weight: 6, category: "mental_health" },
        { word: "can't sleep", weight: 4, category: "mental_health" },
        { word: "breaking down", weight: 5, category: "mental_health" },
      ],
    },
    segments: [
      { id: "seg-0", text: "I've been having panic attacks every day for the past two weeks.", included: true, isSensitive: false },
      { id: "seg-1", text: "I can't sleep and I can't focus on anything.", included: true, isSensitive: false },
      { id: "seg-2", text: "My dissertation is due in ten days and I feel like I'm breaking down.", included: true, isSensitive: false },
    ],
  },

  // ── High — hostel eviction ────────────────────────────────────────────────
  {
    ...BASE,
    _v: 2,
    id: "mock-003",
    createdAt: minsAgo(31),
    submitted: true,
    intakeData: {
      mainText: "I'm about to be evicted from my private flat. My landlord has given me one week. I have nowhere to go and I can't afford a deposit anywhere. I'm completely overwhelmed.",
      contextText: "2nd year, estranged from family.",
    },
    scoringResult: {
      score: 13,
      urgencyLevel: "high",
      primaryCategory: "housing",
      secondaryCategory: "financial",
      isCrisis: false,
      source: "rules",
      evidencePhrases: ["evicted", "can't afford", "overwhelmed"],
      needsHumanTriage: false,
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
      secondaryCategory: "financial",
      explanation: "Your message signals significant distress — evicted, can't afford. Routed to Student Housing & Accommodation.",
      score: 13,
      isCrisis: false,
      source: "rules",
      evidencePhrases: ["evicted", "can't afford"],
      needsHumanTriage: false,
      matchedKeywords: [
        { word: "evicted", weight: 5, category: "housing" },
        { word: "can't afford", weight: 4, category: "financial" },
      ],
    },
    segments: [
      { id: "seg-0", text: "I'm about to be evicted from my private flat.", included: true, isSensitive: false },
      { id: "seg-1", text: "My landlord has given me one week.", included: true, isSensitive: false },
      { id: "seg-2", text: "I have nowhere to go and I can't afford a deposit anywhere.", included: true, isSensitive: false },
    ],
  },

  // ── Medium — exam + health issues (secondary physical_health) ─────────────
  {
    ...BASE,
    _v: 2,
    id: "mock-004",
    createdAt: minsAgo(52),
    submitted: true,
    intakeData: {
      mainText: "I need accommodations for my upcoming exam due to health issues. I've been ill for the past week and couldn't attend lectures. I want to request an extension.",
      contextText: "1st year undergrad, medical certificate attached.",
    },
    scoringResult: {
      score: 9,
      urgencyLevel: "medium",
      primaryCategory: "academic_stress",
      secondaryCategory: "physical_health",
      isCrisis: false,
      source: "rules",
      evidencePhrases: ["exam", "health issues", "ill", "extension"],
      needsHumanTriage: false,
      matchedKeywords: [
        { word: "exam", weight: 3, category: "academic_stress" },
        { word: "health issues", weight: 3, category: "physical_health" },
        { word: "ill", weight: 2, category: "physical_health" },
        { word: "extension", weight: 2, category: "academic_stress" },
      ],
    },
    routingResult: {
      department: DEPARTMENTS["academic_support"],
      urgencyLevel: "medium",
      category: "academic_stress",
      secondaryCategory: "physical_health",
      explanation: "Your message indicates pressure — exam, health issues, extension. Routed to Academic Support & Advising.",
      score: 9,
      isCrisis: false,
      source: "rules",
      evidencePhrases: ["exam", "health issues", "extension"],
      needsHumanTriage: false,
      matchedKeywords: [
        { word: "exam", weight: 3, category: "academic_stress" },
        { word: "health issues", weight: 3, category: "physical_health" },
      ],
    },
    segments: [
      { id: "seg-0", text: "I need accommodations for my upcoming exam due to health issues.", included: true, isSensitive: false },
      { id: "seg-1", text: "I've been ill for the past week and couldn't attend lectures.", included: true, isSensitive: false },
      { id: "seg-2", text: "I want to request an extension.", included: true, isSensitive: false },
    ],
  },

  // ── Medium — scholarship delay ────────────────────────────────────────────
  {
    ...BASE,
    _v: 2,
    id: "mock-005",
    createdAt: minsAgo(78),
    submitted: true,
    intakeData: {
      mainText: "My scholarship payment has been delayed for two months. I can't pay my hostel fees and I'm running out of money. I don't want to ask my parents because they already sacrificed a lot.",
      contextText: "1st year, government scholarship student.",
    },
    scoringResult: {
      score: 8,
      urgencyLevel: "medium",
      primaryCategory: "financial",
      secondaryCategory: null,
      isCrisis: false,
      source: "rules",
      evidencePhrases: ["scholarship", "fees", "money"],
      needsHumanTriage: false,
      matchedKeywords: [
        { word: "scholarship", weight: 2, category: "financial" },
        { word: "money", weight: 2, category: "financial" },
        { word: "fees", weight: 2, category: "financial" },
      ],
    },
    routingResult: {
      department: DEPARTMENTS["financial_aid"],
      urgencyLevel: "medium",
      category: "financial",
      secondaryCategory: null,
      explanation: "Your message indicates pressure — scholarship, money, fees. Routed to Financial Aid & Hardship Fund.",
      score: 8,
      isCrisis: false,
      source: "rules",
      evidencePhrases: ["scholarship", "money", "fees"],
      needsHumanTriage: false,
      matchedKeywords: [
        { word: "scholarship", weight: 2, category: "financial" },
        { word: "money", weight: 2, category: "financial" },
      ],
    },
    segments: [
      { id: "seg-0", text: "My scholarship payment has been delayed for two months.", included: true, isSensitive: false },
      { id: "seg-1", text: "I can't pay my hostel fees and I'm running out of money.", included: true, isSensitive: false },
      { id: "seg-2", text: "I don't want to ask my parents.", included: false, isSensitive: false },
    ],
  },

  // ── Medium (AI path) — vague phrasing ─────────────────────────────────────
  {
    ...BASE,
    _v: 2,
    id: "mock-006",
    createdAt: minsAgo(95),
    submitted: true,
    intakeData: {
      mainText: "Things have just been really off lately. I can barely get myself to open my laptop most days. My head is just not in it and I keep putting everything off.",
      contextText: "Second year, shared housing.",
    },
    scoringResult: {
      score: 2,
      urgencyLevel: "medium",
      primaryCategory: "mental_health",
      secondaryCategory: "academic_stress",
      isCrisis: false,
      source: "ai",
      aiConfidence: 0.74,
      evidencePhrases: ["barely get myself", "not in it", "putting everything off"],
      needsHumanTriage: false,
      matchedKeywords: [],
    },
    routingResult: {
      department: DEPARTMENTS["wellbeing"],
      urgencyLevel: "medium",
      category: "mental_health",
      secondaryCategory: "academic_stress",
      explanation: "An AI model detected emotional difficulty and reduced motivation. Routed to Student Wellbeing Service.",
      score: 2,
      isCrisis: false,
      source: "ai",
      aiConfidence: 0.74,
      evidencePhrases: ["barely get myself", "not in it", "putting everything off"],
      needsHumanTriage: false,
      matchedKeywords: [],
    },
    segments: [
      { id: "seg-0", text: "Things have just been really off lately.", included: true, isSensitive: false },
      { id: "seg-1", text: "I can barely get myself to open my laptop most days.", included: true, isSensitive: false },
      { id: "seg-2", text: "I keep putting everything off and I don't know what's wrong.", included: true, isSensitive: false },
    ],
  },

  // ── Low — social isolation ─────────────────────────────────────────────────
  {
    ...BASE,
    _v: 2,
    id: "mock-007",
    createdAt: minsAgo(140),
    submitted: true,
    intakeData: {
      mainText: "I've been feeling a bit lonely since starting university. It's hard to make friends and I feel disconnected from my course. Not sure who to talk to about it.",
      contextText: "1st year, commuter student.",
    },
    scoringResult: {
      score: 4,
      urgencyLevel: "low",
      primaryCategory: "social_isolation",
      secondaryCategory: null,
      isCrisis: false,
      source: "rules",
      evidencePhrases: ["lonely", "disconnected"],
      needsHumanTriage: false,
      matchedKeywords: [
        { word: "lonely", weight: 3, category: "social_isolation" },
        { word: "disconnected", weight: 3, category: "social_isolation" },
      ],
    },
    routingResult: {
      department: DEPARTMENTS["wellbeing"],
      urgencyLevel: "low",
      category: "social_isolation",
      secondaryCategory: null,
      explanation: "Your message suggests early support could help — lonely, disconnected. Routed to Student Wellbeing Service.",
      score: 4,
      isCrisis: false,
      source: "rules",
      evidencePhrases: ["lonely", "disconnected"],
      needsHumanTriage: false,
      matchedKeywords: [
        { word: "lonely", weight: 3, category: "social_isolation" },
        { word: "disconnected", weight: 3, category: "social_isolation" },
      ],
    },
    segments: [
      { id: "seg-0", text: "I've been feeling a bit lonely since starting university.", included: true, isSensitive: false },
      { id: "seg-1", text: "It's hard to make friends and I feel disconnected from my course.", included: true, isSensitive: false },
      { id: "seg-2", text: "Not sure who to talk to about it.", included: true, isSensitive: false },
    ],
  },

  // ── Riya's request #1 — triaged/assigned (shows progress in My Requests) ──
  {
    ...BASE,
    _v: 2,
    id: "mock-riya-1",
    createdAt: minsAgo(360),
    submitted: true,
    studentId: RIYA_ID,
    studentName: "Riya Sharma",
    status: "assigned",
    assignedTo: "Dr. Sarah Okafor",
    assignedDepartmentId: "wellbeing",
    acknowledgedAt: null,
    events: [
      { id: "ev-r1-1", type: "submitted", timestamp: minsAgo(360), actor: "Riya Sharma", actorRole: "student", detail: "Case submitted" },
      { id: "ev-r1-2", type: "scored", timestamp: minsAgo(360), actor: "system", actorRole: "system", detail: "Score: 12, source: rules" },
      { id: "ev-r1-3", type: "routed", timestamp: minsAgo(359), actor: "system", actorRole: "system", detail: "Routed to Student Wellbeing Service" },
      { id: "ev-r1-4", type: "consent_reviewed", timestamp: minsAgo(358), actor: "Riya Sharma", actorRole: "student" },
      { id: "ev-r1-5", type: "viewed", timestamp: minsAgo(300), actor: "Dr. Sarah Okafor", actorRole: "staff", detail: "Opened by staff" },
      { id: "ev-r1-6", type: "assigned", timestamp: minsAgo(295), actor: "Dr. Sarah Okafor", actorRole: "staff", detail: "Accepted by Dr. Sarah Okafor" },
    ],
    intakeData: {
      mainText: "I've been really overwhelmed with my dissertation and haven't been sleeping. I feel like I'm falling behind everyone else.",
      contextText: "3rd year BSc Computer Science.",
    },
    scoringResult: {
      score: 12,
      urgencyLevel: "high",
      primaryCategory: "mental_health",
      secondaryCategory: "academic_stress",
      isCrisis: false,
      source: "rules",
      evidencePhrases: ["overwhelmed", "not sleeping", "dissertation"],
      needsHumanTriage: false,
      matchedKeywords: [
        { word: "overwhelmed", weight: 4, category: "mental_health" },
        { word: "not sleeping", weight: 4, category: "mental_health" },
        { word: "dissertation", weight: 3, category: "academic_stress" },
      ],
    },
    routingResult: {
      department: DEPARTMENTS["wellbeing"],
      urgencyLevel: "high",
      category: "mental_health",
      secondaryCategory: "academic_stress",
      explanation: "Signals of emotional distress and academic pressure — overwhelmed, not sleeping, dissertation. Routed to Student Wellbeing Service.",
      score: 12,
      isCrisis: false,
      source: "rules",
      evidencePhrases: ["overwhelmed", "not sleeping", "dissertation"],
      needsHumanTriage: false,
      matchedKeywords: [],
    },
    segments: [
      { id: "seg-0", text: "I've been really overwhelmed with my dissertation.", included: true, isSensitive: false },
      { id: "seg-1", text: "I haven't been sleeping and feel like I'm falling behind.", included: true, isSensitive: false },
    ],
  },

  // ── Riya's request #2 — appointment offered ───────────────────────────────
  {
    ...BASE,
    _v: 2,
    id: "mock-riya-2",
    createdAt: minsAgo(2880),
    submitted: true,
    studentId: RIYA_ID,
    studentName: "Riya Sharma",
    status: "appointment_offered",
    assignedTo: "Priya Menon",
    assignedDepartmentId: "academic_support",
    offeredAppointment: { id: "slot-1", label: "Mon 28 Oct, 10:00–10:30", available: true },
    events: [
      { id: "ev-r2-1", type: "submitted", timestamp: minsAgo(2880), actor: "Riya Sharma", actorRole: "student", detail: "Case submitted" },
      { id: "ev-r2-2", type: "scored", timestamp: minsAgo(2880), actor: "system", actorRole: "system", detail: "Score: 7, source: rules" },
      { id: "ev-r2-3", type: "routed", timestamp: minsAgo(2879), actor: "system", actorRole: "system", detail: "Routed to Academic Support" },
      { id: "ev-r2-4", type: "consent_reviewed", timestamp: minsAgo(2878), actor: "Riya Sharma", actorRole: "student" },
      { id: "ev-r2-5", type: "assigned", timestamp: minsAgo(2800), actor: "Priya Menon", actorRole: "staff", detail: "Accepted by Priya Menon" },
      { id: "ev-r2-6", type: "appointment_offered", timestamp: minsAgo(2700), actor: "Priya Menon", actorRole: "staff", detail: "Offered: Mon 28 Oct, 10:00–10:30" },
    ],
    intakeData: {
      mainText: "I'm struggling with assignment deadlines and need help with study planning. I've been procrastinating a lot and can't focus.",
      contextText: "3rd year, first time asking for academic help.",
    },
    scoringResult: {
      score: 7,
      urgencyLevel: "medium",
      primaryCategory: "academic_stress",
      secondaryCategory: null,
      isCrisis: false,
      source: "rules",
      evidencePhrases: ["assignment", "procrastinating", "can't focus"],
      needsHumanTriage: false,
      matchedKeywords: [
        { word: "assignment", weight: 2, category: "academic_stress" },
        { word: "procrastinating", weight: 2, category: "academic_stress" },
        { word: "can't focus", weight: 3, category: "academic_stress" },
      ],
    },
    routingResult: {
      department: DEPARTMENTS["academic_support"],
      urgencyLevel: "medium",
      category: "academic_stress",
      secondaryCategory: null,
      explanation: "Your message indicates academic pressure — assignment, procrastinating, can't focus. Routed to Academic Support.",
      score: 7,
      isCrisis: false,
      source: "rules",
      evidencePhrases: ["assignment", "procrastinating", "can't focus"],
      needsHumanTriage: false,
      matchedKeywords: [],
    },
    segments: [
      { id: "seg-0", text: "I'm struggling with assignment deadlines and need help with study planning.", included: true, isSensitive: false },
      { id: "seg-1", text: "I've been procrastinating a lot and can't focus.", included: true, isSensitive: false },
    ],
  },
];

const URGENCY_ORDER: Record<string, number> = {
  crisis: 0, high: 1, medium: 2, low: 3,
};

export function getSortedMockCases(): CaseRecord[] {
  return [...MOCK_CASES].sort(
    (a, b) =>
      URGENCY_ORDER[a.routingResult.urgencyLevel] -
      URGENCY_ORDER[b.routingResult.urgencyLevel]
  );
}

export function getCaseLabel(caseRecord: CaseRecord): string {
  return `Case #${caseRecord.id.slice(-3).toUpperCase()}`;
}

export { RIYA_ID };
