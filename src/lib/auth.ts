/**
 * Unified mock auth — no backend.
 * Sessions persist in localStorage. Roles: student | staff | admin | guest.
 */

import type { UserSession } from "@/types";

const SESSION_KEY = "campusreach_session";

interface DemoAccount {
  email: string;
  password: string;
  session: Omit<UserSession, "id">;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: "riya.s@student.university.edu",
    password: "demo123",
    session: {
      email: "riya.s@student.university.edu",
      name: "Riya Sharma",
      role: "student",
      studentId: "STU2024001",
      year: "3rd year",
    },
  },
  {
    email: "staff@university.edu",
    password: "demo123",
    session: {
      email: "staff@university.edu",
      name: "Dr. Sarah Okafor",
      role: "staff",
      department: "Student Wellbeing Service",
    },
  },
  {
    email: "advisor@university.edu",
    password: "demo123",
    session: {
      email: "advisor@university.edu",
      name: "Priya Menon",
      role: "staff",
      department: "Academic Support & Advising",
    },
  },
  {
    email: "admin@university.edu",
    password: "demo123",
    session: {
      email: "admin@university.edu",
      name: "Head of Student Services",
      role: "admin",
      department: "Student Services",
    },
  },
];

function makeId(): string {
  return `user-${Math.random().toString(36).slice(2, 9)}`;
}

export function loginWithCredentials(
  email: string,
  password: string
): UserSession | null {
  const account = DEMO_ACCOUNTS.find(
    (a) =>
      a.email.toLowerCase() === email.trim().toLowerCase() &&
      a.password === password
  );
  if (!account) return null;

  const session: UserSession = { ...account.session, id: makeId() };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // private mode
  }
  return session;
}

export function getStoredSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserSession;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

export function continueAsGuest(): UserSession {
  return {
    id: makeId(),
    email: "",
    name: "Guest",
    role: "guest",
  };
}

/** Demo accounts list — displayed on login screen, always visible */
export const DEMO_CREDENTIALS = DEMO_ACCOUNTS.map((a) => ({
  email: a.email,
  password: a.password,
  role: a.session.role,
  name: a.session.name,
}));
