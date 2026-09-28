/**
 * Unified mock auth — no backend.
 * Sessions persist in localStorage. Roles: student | staff | admin | guest.
 *
 * Demo credentials are NOT exported or rendered in the UI.
 * See DEMO_ACCOUNTS.md at the repo root for the credential list.
 */

import type { UserSession } from "@/types";

const SESSION_KEY   = "campusreach_session";
const USERS_KEY     = "campusreach_users";     // self-registered students
const ATTEMPTS_KEY  = "campusreach_attempts";  // lockout tracking

// ── Config ────────────────────────────────────────────────────────────────────
export const SESSION_MAX_AGE_MS   = 8  * 60 * 60 * 1000;  // 8 hours
export const INACTIVITY_WARN_MS   = 29 * 60 * 1000;       // warn after 29 min
export const INACTIVITY_LIMIT_MS  = 30 * 60 * 1000;       // sign out after 30 min
export const MAX_FAILED_ATTEMPTS  = 5;
export const LOCKOUT_DURATION_MS  = 30 * 1000;             // 30 seconds

// ── Internal types ────────────────────────────────────────────────────────────

interface StoredUser {
  email: string;
  /** SHA-256 hex of salt+password, or plain password if crypto.subtle unavailable */
  passwordHash: string;
  salt: string;
  name: string;
  role: "student";
  studentId: string;
  year: string;
  createdAt: string;
}

interface AttemptsRecord {
  count: number;
  lockedUntil: number | null;
}

// ── Hardcoded demo accounts (NOT exported — see DEMO_ACCOUNTS.md) ─────────────

interface DemoAccount {
  email: string;
  password: string;
  session: Omit<UserSession, "id">;
  /** maps to a DEPARTMENTS key for queue scoping */
  departmentId?: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  // ── Students ────────────────────────────────────────────────────────────────
  {
    email: "riya.s@student.university.edu",
    password: "demo123",
    session: {
      email: "riya.s@student.university.edu",
      name: "Riya Sharma",
      role: "student",
      studentId: "STU2024001",
      year: "2nd year CS",
    },
  },
  {
    email: "arjun.r@student.university.edu",
    password: "demo123",
    session: {
      email: "arjun.r@student.university.edu",
      name: "Arjun Rao",
      role: "student",
      studentId: "STU2024002",
      year: "1st year",
    },
  },

  // ── Staff ────────────────────────────────────────────────────────────────────
  {
    email: "staff@university.edu",
    password: "demo123",
    departmentId: "wellbeing",
    session: {
      email: "staff@university.edu",
      name: "Dr. Sarah Okafor",
      role: "staff",
      department: "Student Wellbeing Service",
      departmentId: "wellbeing",
    },
  },
  {
    email: "advisor@university.edu",
    password: "demo123",
    departmentId: "academic_support",
    session: {
      email: "advisor@university.edu",
      name: "Priya Menon",
      role: "staff",
      department: "Academic Support & Advising",
      departmentId: "academic_support",
    },
  },
  {
    email: "frontdesk@university.edu",
    password: "demo123",
    departmentId: "human_triage",
    session: {
      email: "frontdesk@university.edu",
      name: "Kavya Reddy",
      role: "staff",
      department: "Student Support Front Desk",
      departmentId: "human_triage",
    },
  },

  // ── Admin ────────────────────────────────────────────────────────────────────
  {
    email: "admin@university.edu",
    password: "demo123",
    departmentId: undefined,
    session: {
      email: "admin@university.edu",
      name: "Head of Student Services",
      role: "admin",
      department: "Student Services",
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeId(): string {
  return `user-${Math.random().toString(36).slice(2, 9)}`;
}

function makeStudentId(): string {
  return `STU${Date.now().toString().slice(-7)}`;
}

async function hashPassword(password: string, salt: string): Promise<string> {
  if (typeof crypto?.subtle?.digest !== "function") {
    // Fallback for environments where SubtleCrypto is unavailable
    return `plain:${salt}:${password}`;
  }
  const enc = new TextEncoder();
  const data = enc.encode(salt + password);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyPassword(
  password: string,
  salt: string,
  hash: string
): Promise<boolean> {
  if (hash.startsWith("plain:")) {
    return hash === `plain:${salt}:${password}`;
  }
  const computed = await hashPassword(password, salt);
  return computed === hash;
}

function makeSalt(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

// ── Lockout helpers ───────────────────────────────────────────────────────────

function getAttempts(email: string): AttemptsRecord {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    if (!raw) return { count: 0, lockedUntil: null };
    const all: Record<string, AttemptsRecord> = JSON.parse(raw);
    return all[email.toLowerCase()] ?? { count: 0, lockedUntil: null };
  } catch {
    return { count: 0, lockedUntil: null };
  }
}

function setAttempts(email: string, rec: AttemptsRecord): void {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    const all: Record<string, AttemptsRecord> = raw ? JSON.parse(raw) : {};
    all[email.toLowerCase()] = rec;
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(all));
  } catch { /* storage full */ }
}

export function recordFailedAttempt(email: string): {
  lockedUntil: number | null;
  attemptsLeft: number;
} {
  const rec = getAttempts(email);
  const newCount = rec.count + 1;
  const locked = newCount >= MAX_FAILED_ATTEMPTS;
  const lockedUntil = locked ? Date.now() + LOCKOUT_DURATION_MS : null;
  setAttempts(email, { count: newCount, lockedUntil });
  return {
    lockedUntil,
    attemptsLeft: Math.max(0, MAX_FAILED_ATTEMPTS - newCount),
  };
}

export function clearAttempts(email: string): void {
  setAttempts(email, { count: 0, lockedUntil: null });
}

export function getLockoutStatus(email: string): {
  locked: boolean;
  remainingMs: number;
} {
  const rec = getAttempts(email);
  if (rec.lockedUntil && Date.now() < rec.lockedUntil) {
    return { locked: true, remainingMs: rec.lockedUntil - Date.now() };
  }
  // Auto-clear expired lockout
  if (rec.lockedUntil && Date.now() >= rec.lockedUntil) {
    setAttempts(email, { count: 0, lockedUntil: null });
  }
  return { locked: false, remainingMs: 0 };
}

// ── Self-registration ─────────────────────────────────────────────────────────

function loadUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as StoredUser[]) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]): void {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch { /* storage full */ }
}

export async function registerStudent(params: {
  name: string;
  email: string;
  password: string;
}): Promise<{ ok: true; session: UserSession } | { ok: false; error: string }> {
  const email = params.email.trim().toLowerCase();

  // Block creating staff/admin accounts from UI
  const isDemoAccount = DEMO_ACCOUNTS.some(
    (a) => a.email.toLowerCase() === email
  );
  if (isDemoAccount) {
    return { ok: false, error: "An account with this email already exists." };
  }

  const users = loadUsers();
  if (users.some((u) => u.email === email)) {
    return { ok: false, error: "An account with this email already exists." };
  }

  const salt = makeSalt();
  const passwordHash = await hashPassword(params.password, salt);
  const studentId = makeStudentId();

  const stored: StoredUser = {
    email,
    passwordHash,
    salt,
    name: params.name.trim(),
    role: "student",
    studentId,
    year: "1st year",
    createdAt: new Date().toISOString(),
  };
  saveUsers([...users, stored]);

  const session: UserSession = {
    id: makeId(),
    email,
    name: stored.name,
    role: "student",
    studentId,
    year: stored.year,
  };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch { /* private mode */ }

  return { ok: true, session };
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function loginWithCredentials(
  email: string,
  password: string
): Promise<UserSession | null> {
  const normalised = email.trim().toLowerCase();

  // Check demo accounts first (sync, no hashing needed)
  const demo = DEMO_ACCOUNTS.find(
    (a) => a.email.toLowerCase() === normalised && a.password === password
  );
  if (demo) {
    const session: UserSession = { ...demo.session, id: makeId() };
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* */ }
    return session;
  }

  // Check self-registered students
  const users = loadUsers();
  const user = users.find((u) => u.email === normalised);
  if (user) {
    const ok = await verifyPassword(password, user.salt, user.passwordHash);
    if (!ok) return null;
    const session: UserSession = {
      id: makeId(),
      email: user.email,
      name: user.name,
      role: "student",
      studentId: user.studentId,
      year: user.year,
    };
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* */ }
    return session;
  }

  return null;
}

// ── Session management ────────────────────────────────────────────────────────

export interface StoredSessionEnvelope {
  session: UserSession;
  expiresAt: number;
  lastActiveAt: number;
}

export function getStoredSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as StoredSessionEnvelope | UserSession;

    // Handle legacy sessions that were stored without an envelope
    if (!("expiresAt" in envelope)) {
      // Upgrade: wrap it
      const upgraded: StoredSessionEnvelope = {
        session: envelope as UserSession,
        expiresAt: Date.now() + SESSION_MAX_AGE_MS,
        lastActiveAt: Date.now(),
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(upgraded));
      return upgraded.session;
    }

    if (Date.now() > envelope.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return envelope.session;
  } catch {
    return null;
  }
}

export function touchSession(): void {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const envelope = JSON.parse(raw) as StoredSessionEnvelope;
    if (!envelope.session) return;
    envelope.lastActiveAt = Date.now();
    localStorage.setItem(SESSION_KEY, JSON.stringify(envelope));
  } catch { /* */ }
}

export function getLastActiveAt(): number {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return Date.now();
    const envelope = JSON.parse(raw) as StoredSessionEnvelope;
    return envelope.lastActiveAt ?? Date.now();
  } catch {
    return Date.now();
  }
}

export function persistSession(session: UserSession): void {
  const envelope: StoredSessionEnvelope = {
    session,
    expiresAt: Date.now() + SESSION_MAX_AGE_MS,
    lastActiveAt: Date.now(),
  };
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(envelope)); } catch { /* */ }
}

export function clearSession(): void {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* */ }
}

export function continueAsGuest(): UserSession {
  return { id: makeId(), email: "", name: "Guest", role: "guest" };
}
