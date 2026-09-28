/**
 * In-memory + localStorage data layer with simulated 200–300ms latency.
 * Mirrors what a real Supabase call would look like from the UI's perspective.
 */

import type { CaseRecord } from "@/types";
import { simulatedLatency } from "./utils";

const STORAGE_KEY = "campusreach_cases";

// In-memory cache for this session
let cache: CaseRecord[] = [];
let hydrated = false;

function hydrate() {
  if (hydrated) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) cache = JSON.parse(raw) as CaseRecord[];
  } catch {
    cache = [];
  }
  hydrated = true;
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // storage full or private mode — silently continue
  }
}

function generateId(): string {
  return `case-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function saveCase(
  record: Omit<CaseRecord, "id" | "createdAt">
): Promise<CaseRecord> {
  await simulatedLatency();
  hydrate();

  const full: CaseRecord = {
    ...record,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };

  cache.unshift(full);
  persist();
  return full;
}

export async function updateCase(
  id: string,
  patch: Partial<CaseRecord>
): Promise<CaseRecord | null> {
  await simulatedLatency();
  hydrate();

  const idx = cache.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  cache[idx] = { ...cache[idx], ...patch };
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

export async function clearCases(): Promise<void> {
  await simulatedLatency();
  cache = [];
  localStorage.removeItem(STORAGE_KEY);
}
