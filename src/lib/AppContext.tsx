import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import type { CaseRecord, IntakeFormData, TextSegment } from "@/types";
import { scoreText } from "./scoring";
import { routeCase, splitIntoSegments } from "./routing";
import { saveCase, updateCase } from "./store";

// ── Screen union ──────────────────────────────────────────────────────────────
export type AppScreen =
  | "intake"
  | "processing"
  | "crisis"
  | "result"
  | "handoff"
  | "staff-login"  // login gate — sits in front of queue
  | "queue"        // staff case queue
  | "staff";       // individual case detail

// ── Staff session ─────────────────────────────────────────────────────────────
export interface StaffSession {
  name: string;
  department: string;
}

// Hardcoded demo accounts — no backend
const DEMO_ACCOUNTS: Record<string, StaffSession> = {
  "staff@university.edu": {
    name: "Dr. Sarah Okafor",
    department: "Student Wellbeing Service",
  },
  "advisor@university.edu": {
    name: "Priya Menon",
    department: "Academic Support & Advising",
  },
};

const DEMO_PASSWORD = "demo123";

// ── State ─────────────────────────────────────────────────────────────────────
interface AppState {
  screen: AppScreen;
  currentCase: CaseRecord | null;
  isLoading: boolean;
  error: string | null;
  staffSession: StaffSession | null;
}

interface AppContextValue extends AppState {
  submitIntake: (data: IntakeFormData) => Promise<void>;
  updateSegments: (segments: TextSegment[]) => void;
  confirmHandoff: () => Promise<void>;
  goToHandoff: () => void;
  /** Routes to staff-login if not authenticated, queue otherwise */
  goToQueue: () => void;
  goToStaff: (caseRecord?: CaseRecord) => void;
  resetToIntake: () => void;
  /** Returns true on success, false on wrong credentials */
  loginStaff: (email: string, password: string) => boolean;
  logoutStaff: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    screen: "intake",
    currentCase: null,
    isLoading: false,
    error: null,
    staffSession: null,
  });

  // ── Student flow ─────────────────────────────────────────────────────────
  const submitIntake = useCallback(async (data: IntakeFormData) => {
    setState((s) => ({ ...s, isLoading: true, error: null, screen: "processing" }));
    try {
      const scoringResult = scoreText(
        `${data.mainText} ${data.contextText}`.trim()
      );
      const routingResult = await routeCase(scoringResult);
      const segments = splitIntoSegments(data.mainText);
      const record = await saveCase({
        intakeData: data,
        scoringResult,
        routingResult,
        segments,
        submitted: false,
      });
      setState((s) => ({
        ...s,
        screen: scoringResult.isCrisis ? "crisis" : "result",
        currentCase: record,
        isLoading: false,
        error: null,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: "Something went wrong. Please try again.",
        screen: "intake",
      }));
      console.error(err);
    }
  }, []);

  const updateSegments = useCallback((segments: TextSegment[]) => {
    setState((s) => {
      if (!s.currentCase) return s;
      return { ...s, currentCase: { ...s.currentCase, segments } };
    });
  }, []);

  const confirmHandoff = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      if (state.currentCase) {
        await updateCase(state.currentCase.id, { submitted: true });
      }
      setState((s) => ({
        ...s,
        isLoading: false,
        screen: "staff",
        currentCase: s.currentCase
          ? { ...s.currentCase, submitted: true }
          : null,
      }));
    } catch {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, [state.currentCase]);

  const goToHandoff = useCallback(() => {
    setState((s) => ({ ...s, screen: "handoff" }));
  }, []);

  // ── Staff flow ────────────────────────────────────────────────────────────

  /** Gate: send to login if no session, queue if already authenticated */
  const goToQueue = useCallback(() => {
    setState((s) => ({
      ...s,
      screen: s.staffSession ? "queue" : "staff-login",
    }));
  }, []);

  const goToStaff = useCallback((caseRecord?: CaseRecord) => {
    setState((s) => ({
      ...s,
      screen: "staff",
      currentCase: caseRecord !== undefined ? caseRecord : s.currentCase,
    }));
  }, []);

  const loginStaff = useCallback(
    (email: string, password: string): boolean => {
      const normalised = email.trim().toLowerCase();
      const session = DEMO_ACCOUNTS[normalised];
      if (!session || password !== DEMO_PASSWORD) return false;
      setState((s) => ({
        ...s,
        staffSession: session,
        screen: "queue",
      }));
      return true;
    },
    []
  );

  const logoutStaff = useCallback(() => {
    setState((s) => ({
      ...s,
      staffSession: null,
      screen: "staff-login",
    }));
  }, []);

  const resetToIntake = useCallback(() => {
    setState((s) => ({
      screen: "intake",
      currentCase: null,
      isLoading: false,
      error: null,
      staffSession: s.staffSession, // preserve login across student demos
    }));
  }, []);

  return (
    <AppContext.Provider
      value={{
        ...state,
        submitIntake,
        updateSegments,
        confirmHandoff,
        goToHandoff,
        goToQueue,
        goToStaff,
        resetToIntake,
        loginStaff,
        logoutStaff,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
