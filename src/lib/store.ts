/**
 * In-memory + localStorage data layer with simulated 200–300ms latency.
 * Migrates v1 records to v2 on hydration.
 */

import type { CaseRecord, CaseStatus } from "@/types";
import { simulatedLatency } from "./utils";

const STORAGE_KEY = "campusreach_cases";

let cache: CaseRecord[] = [];
let hydrated = false;

// ── Migration ──────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrateRecord(raw: any): CaseRecord {
  const scoring = raw.scoringResult ?? {};
  const routing = raw.routingResult ?? {};

  return {
    _v: 2,
    id: raw.id ?? `migrated-${Date.now()}`,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    submitted: raw.submitted ?? false,
    studentId: raw.studentId ?? null,
    studentName: raw.studentName ?? null,
    status: (raw.status as CaseStatus) ?? "submitted",
    assignedTo: raw.assignedTo ?? null,
    assignedDepartmentId: raw.assignedDepartmentId ?? null,
    events: Array.isArray(raw.events) ? raw.events : [],
    notes: Array.isArray(raw.notes) ? raw.notes : [],
    appointmentSlots: Array.isArray(raw.appointmentSlots) ? raw.appointmentSlots : [],
    offeredAppointment: raw.offeredAppointment ?? null,
    routingFeedback: raw.routingFeedback ?? null,
    revokedAt: raw.revokedAt ?? null,
    acknowledgedAt: raw.acknowledgedAt ?? null,
    intakeData: raw.intakeData ?? { mainText: "", contextText: "" },
    segments: Array.isArray(raw.segments) ? raw.segments : [],
    scoringResult: {
      score: scoring.score ?? 0,
      urgencyLevel: scoring.urgencyLevel ?? "low",
      primaryCategory: scoring.primaryCategory ?? "general",
      secondaryCategory: scoring.secondaryCategory ?? null,
      matchedKeywords: scoring.matchedKeywords ?? [],
      isCrisis: scoring.isCrisis ?? false,
      source: scoring.source ?? "rules",
      aiConfidence: scoring.aiConfidence,
      evidencePhrases: scoring.evidencePhrases ?? [],
      needsHumanTriage: scoring.needsHumanTriage ?? false,
    },
    routingResult: {
      department: routing.department ?? {
        id: "general_advice",
        name: "Student Services Hub",
        shortName: "Student Services",
        description: "General advice and signposting.",
        contact: "studentservices@university.edu",
        typicalWait: "Same day",
        color: "teal",
      },
      urgencyLevel: routing.urgencyLevel ?? "low",
      category: routing.category ?? "general",
      secondaryCategory: routing.secondaryCategory ?? null,
      explanation: routing.explanation ?? "",
      score: routing.score ?? 0,
      matchedKeywords: routing.matchedKeywords ?? [],
      isCrisis: routing.isCrisis ?? false,
      source: routing.source ?? "rules",
      aiConfidence: routing.aiConfidence,
      evidencePhrases: routing.evidencePhrases ?? [],
      needsHumanTriage: routing.needsHumanTriage ?? false,
    },
  };
}

function hydrate() {
  if (hydrated) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed: any[] = JSON.parse(raw);
      cache = parsed.map(migrateRecord);
    }
  } catch {
    cache = [];
  }
  hydrated = true;
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch { /* storage full */ }
}

function generateId(): string {
  return `case-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function generateEventId(): string {
  return `ev-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
}

export { generateEventId };

export async function saveCase(
  record: Omit<CaseRecord, "id" | "createdAt" | "_v">
): Promise<CaseRecord> {
  await simulatedLatency();
  hydrate();

  const full: CaseRecord = {
    ...record,
    _v: 2,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };

  cache.unshift(full);
  persist();
  return full;
}

export async function updateCase(
  id: string,
  patch: Partial<Omit<CaseRecord, "_v">>
): Promise<CaseRecord | null> {
  await simulatedLatency();
  hydrate();

  const idx = cache.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  cache[idx] = { ...cache[idx], ...patch, _v: 2 };
  persist();
  return cache[idx];
}

export async function getCase(id: string): Promise<CaseRecord | null> {
  await simulatedLatency();
  hydrate();
  return cache.find((c) => c.id === id) ?? null;
}

export async function listCases(): Promise<CaseRecord[]> {
  await simulatedLatency();
  hydrate();
  return [...cache];
}

export async function getCasesByStudent(studentId: string): Promise<CaseRecord[]> {
  await simulatedLatency();
  hydrate();
  return cache.filter((c) => c.studentId === studentId);
}

export async function clearCases(): Promise<void> {
  await simulatedLatency();
  cache = [];
  localStorage.removeItem(STORAGE_KEY);
}

/** Reset to seed data */
export function resetToSeed(seedCases: CaseRecord[]): void {
  cache = [...seedCases];
  hydrated = true;
  persist();
}
