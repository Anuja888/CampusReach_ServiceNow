import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type {
  AppointmentSlot,
  CaseEvent,
  CaseRecord,
  CaseStatus,
  IntakeFormData,
  RoutingFeedback,
  TextSegment,
  UserSession,
} from "@/types";
import { classifyText } from "./classify";
import { routeCase, splitIntoSegments } from "./routing";
import {
  clearCases,
  generateEventId,
  getCasesByStudent,
  listCases,
  resetToSeed,
  saveCase,
  updateCase,
} from "./store";
import { loginWithCredentials, getStoredSession, clearSession, continueAsGuest } from "./auth";

// ── Screen union ──────────────────────────────────────────────────────────────

export type AppScreen =
  | "landing"           // entry: sign in or guest
  | "intake"
  | "processing"
  | "crisis"
  | "result"
  | "handoff"
  | "my-requests"       // student case tracker
  | "staff-login"       // kept for backward compat (landing handles both)
  | "queue"
  | "staff"
  | "admin";

// ── State ─────────────────────────────────────────────────────────────────────

interface AppState {
  screen: AppScreen;
  session: UserSession | null;
  currentCase: CaseRecord | null;
  studentCases: CaseRecord[];
  isLoading: boolean;
  error: string | null;
  // legacy alias kept so StaffQueue/StaffView don't break
  staffSession: { name: string; department: string } | null;
}

interface AppContextValue extends AppState {
  // Auth
  login: (email: string, password: string) => boolean;
  loginAsGuest: () => void;
  logout: () => void;
  /** Legacy compat: returns boolean, navigates to queue on success */
  loginStaff: (email: string, password: string) => boolean;
  logoutStaff: () => void;

  // Student flow
  submitIntake: (data: IntakeFormData) => Promise<void>;
  updateSegments: (segments: TextSegment[]) => void;
  confirmHandoff: () => Promise<void>;
  goToHandoff: () => void;
  goToMyRequests: () => void;
  revokeCase: (caseId: string) => Promise<void>;

  // Staff flow
  goToQueue: () => void;
  goToStaff: (caseRecord?: CaseRecord) => void;
  acceptCase: (caseId: string) => Promise<void>;
  reassignCase: (caseId: string, departmentId: string, reason: string) => Promise<void>;
  addNote: (caseId: string, text: string) => Promise<void>;
  offerAppointment: (caseId: string, slot: AppointmentSlot) => Promise<void>;
  setStatus: (caseId: string, status: CaseStatus) => Promise<void>;
  acknowledgeCase: (caseId: string) => Promise<void>;
  submitRoutingFeedback: (caseId: string, feedback: RoutingFeedback) => Promise<void>;
  logView: (caseId: string) => Promise<void>;

  // Admin
  goToAdmin: () => void;

  // General
  resetToIntake: () => void;
  goToLanding: () => void;

  // Seed reset
  resetDemo: (seedCases: CaseRecord[]) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEvent(
  type: CaseEvent["type"],
  actor: string,
  actorRole: CaseEvent["actorRole"],
  detail?: string,
  metadata?: Record<string, unknown>
): CaseEvent {
  return {
    id: generateEventId(),
    type,
    timestamp: new Date().toISOString(),
    actor,
    actorRole,
    detail,
    metadata,
  };
}

const MOCK_APPOINTMENT_SLOTS: AppointmentSlot[] = [
  { id: "slot-1", label: "Mon 28 Oct, 10:00–10:30", available: true },
  { id: "slot-2", label: "Tue 29 Oct, 14:00–14:30", available: true },
  { id: "slot-3", label: "Wed 30 Oct, 11:00–11:30", available: true },
];

// ── Provider ──────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    const storedSession = getStoredSession();
    return {
      screen: "intake",
      session: storedSession,
      currentCase: null,
      studentCases: [],
      isLoading: false,
      error: null,
      staffSession: storedSession?.role === "staff" || storedSession?.role === "admin"
        ? { name: storedSession.name, department: storedSession.department ?? "" }
        : null,
    };
  });

  // Load student cases when session changes
  useEffect(() => {
    if (state.session?.role === "student" && state.session.studentId) {
      getCasesByStudent(state.session.studentId).then((cases) => {
        setState((s) => ({ ...s, studentCases: cases }));
      });
    }
  }, [state.session?.id]);

  // ── Auth ────────────────────────────────────────────────────────────────────

  const login = useCallback((email: string, password: string): boolean => {
    const session = loginWithCredentials(email, password);
    if (!session) return false;

    setState((s) => ({
      ...s,
      session,
      staffSession:
        session.role === "staff" || session.role === "admin"
          ? { name: session.name, department: session.department ?? "" }
          : null,
      screen:
        session.role === "staff" || session.role === "admin"
          ? "queue"
          : "intake",
    }));
    return true;
  }, []);

  const loginAsGuest = useCallback(() => {
    const session = continueAsGuest();
    setState((s) => ({ ...s, session, screen: "intake", staffSession: null }));
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setState((s) => ({
      ...s,
      session: null,
      staffSession: null,
      screen: "intake",
      currentCase: null,
      studentCases: [],
    }));
  }, []);

  // Legacy staff compat
  const loginStaff = useCallback((email: string, password: string): boolean => {
    return login(email, password);
  }, [login]);

  const logoutStaff = useCallback(() => { logout(); }, [logout]);

  // ── Student flow ────────────────────────────────────────────────────────────

  const submitIntake = useCallback(async (data: IntakeFormData) => {
    setState((s) => ({ ...s, isLoading: true, error: null, screen: "processing" }));

    try {
      const scoringResult = await classifyText(
        `${data.mainText} ${data.contextText}`.trim()
      );
      const routingResult = await routeCase(scoringResult);
      const segments = splitIntoSegments(data.mainText);

      const session = state.session;
      const isGuest = !session || session.role === "guest";

      // Guests in crisis always get the crisis screen — no case created
      if (scoringResult.isCrisis && isGuest) {
        setState((s) => ({
          ...s,
          screen: "crisis",
          currentCase: {
            _v: 2,
            id: "guest-crisis",
            createdAt: new Date().toISOString(),
            studentId: null,
            studentName: null,
            intakeData: data,
            scoringResult,
            routingResult,
            segments,
            submitted: false,
            status: "submitted",
            assignedTo: null,
            assignedDepartmentId: null,
            events: [],
            notes: [],
            appointmentSlots: MOCK_APPOINTMENT_SLOTS,
            offeredAppointment: null,
            routingFeedback: null,
            revokedAt: null,
            acknowledgedAt: null,
          },
          isLoading: false,
          error: null,
        }));
        return;
      }

      const events: CaseEvent[] = [
        makeEvent("submitted", session?.name ?? "Student", session?.role ?? "student"),
        makeEvent("scored", "system", "system", `Score: ${scoringResult.score}, source: ${scoringResult.source}`),
      ];
      if (scoringResult.source === "ai" || scoringResult.source === "ai_cached") {
        events.push(makeEvent("ai_classified", "system", "system", `Confidence: ${scoringResult.aiConfidence}`));
      }
      events.push(makeEvent("routed", "system", "system", `Routed to ${routingResult.department.name}`));

      const record = await saveCase({
        studentId: session?.studentId ?? null,
        studentName: session?.name ?? null,
        intakeData: data,
        scoringResult,
        routingResult,
        segments,
        submitted: false,
        status: "submitted",
        assignedTo: null,
        assignedDepartmentId: null,
        events,
        notes: [],
        appointmentSlots: MOCK_APPOINTMENT_SLOTS,
        offeredAppointment: null,
        routingFeedback: null,
        revokedAt: null,
        acknowledgedAt: null,
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
  }, [state.session]);

  const updateSegments = useCallback((segments: TextSegment[]) => {
    setState((s) => {
      if (!s.currentCase) return s;
      return { ...s, currentCase: { ...s.currentCase, segments } };
    });
  }, []);

  const confirmHandoff = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      if (state.currentCase && state.currentCase.id !== "guest-crisis") {
        const session = state.session;
        const consentEvent = makeEvent(
          "consent_reviewed",
          session?.name ?? "Student",
          session?.role ?? "student"
        );
        const updated = await updateCase(state.currentCase.id, {
          submitted: true,
          status: "triaged",
          events: [...(state.currentCase.events ?? []), consentEvent],
        });
        // Refresh student cases
        if (session?.studentId) {
          const cases = await getCasesByStudent(session.studentId);
          setState((s) => ({
            ...s,
            isLoading: false,
            screen: session.role === "student" ? "my-requests" : "staff",
            currentCase: updated ?? state.currentCase,
            studentCases: cases,
          }));
        } else {
          // Guest or non-student (no studentId) — go back to result/thank-you, not staff view
          setState((s) => ({
            ...s,
            isLoading: false,
            screen: "result",
            currentCase: updated ?? s.currentCase,
          }));
        }
      } else {
        // guest-crisis path or no case — just show intake
        setState((s) => ({ ...s, isLoading: false, screen: "intake" }));
      }
    } catch {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, [state.currentCase, state.session]);

  const goToHandoff = useCallback(() => {
    setState((s) => ({ ...s, screen: "handoff" }));
  }, []);

  const goToMyRequests = useCallback(() => {
    setState((s) => ({ ...s, screen: "my-requests" }));
  }, []);

  const revokeCase = useCallback(async (caseId: string) => {
    const session = state.session;
    const revokeEvent = makeEvent("withdrawn", session?.name ?? "Student", "student", "Revoked by student");
    await updateCase(caseId, {
      status: "withdrawn",
      revokedAt: new Date().toISOString(),
      events: [
        ...(state.studentCases.find((c) => c.id === caseId)?.events ?? []),
        revokeEvent,
      ],
    });
    if (session?.studentId) {
      const cases = await getCasesByStudent(session.studentId);
      setState((s) => ({ ...s, studentCases: cases }));
    }
  }, [state.session, state.studentCases]);

  // ── Staff flow ──────────────────────────────────────────────────────────────

  const goToQueue = useCallback(() => {
    setState((s) => {
      if (!s.session || (s.session.role !== "staff" && s.session.role !== "admin")) {
        return { ...s, screen: "staff-login" };
      }
      return { ...s, screen: "queue" };
    });
  }, []);

  const goToStaff = useCallback((caseRecord?: CaseRecord) => {
    setState((s) => ({
      ...s,
      screen: "staff",
      currentCase: caseRecord !== undefined ? caseRecord : s.currentCase,
    }));
  }, []);

  const logView = useCallback(async (caseId: string) => {
    const session = state.session;
    if (!session) return;
    const c = (await listCases()).find((x) => x.id === caseId);
    if (!c) return;
    const ev = makeEvent("viewed", session.name, session.role);
    await updateCase(caseId, { events: [...c.events, ev] });
    // Update currentCase if it's the same
    setState((s) => {
      if (s.currentCase?.id === caseId) {
        return { ...s, currentCase: { ...s.currentCase, events: [...s.currentCase.events, ev] } };
      }
      return s;
    });
  }, [state.session]);

  const acknowledgeCase = useCallback(async (caseId: string) => {
    const session = state.session;
    const c = (await listCases()).find((x) => x.id === caseId);
    if (!c || !session) return;
    const now = new Date().toISOString();
    const ev = makeEvent("acknowledged", session.name, session.role, "Crisis acknowledged");
    await updateCase(caseId, {
      acknowledgedAt: now,
      status: "triaged",
      events: [...c.events, ev],
    });
    setState((s) => ({
      ...s,
      currentCase: s.currentCase?.id === caseId
        ? { ...s.currentCase, acknowledgedAt: now, status: "triaged", events: [...s.currentCase.events, ev] }
        : s.currentCase,
    }));
  }, [state.session]);

  const acceptCase = useCallback(async (caseId: string) => {
    const session = state.session;
    const c = (await listCases()).find((x) => x.id === caseId);
    if (!c || !session) return;
    const ev = makeEvent("assigned", session.name, session.role, `Accepted by ${session.name}`);
    const updated = await updateCase(caseId, {
      assignedTo: session.name,
      assignedDepartmentId: session.department ?? null,
      status: "assigned",
      events: [...c.events, ev],
    });
    setState((s) => ({
      ...s,
      currentCase: s.currentCase?.id === caseId ? updated ?? s.currentCase : s.currentCase,
    }));
  }, [state.session]);

  const reassignCase = useCallback(
    async (caseId: string, departmentId: string, reason: string) => {
      const session = state.session;
      const c = (await listCases()).find((x) => x.id === caseId);
      if (!c || !session) return;
      const ev = makeEvent("reassigned", session.name, session.role, reason, { departmentId });
      const updated = await updateCase(caseId, {
        assignedDepartmentId: departmentId,
        events: [...c.events, ev],
      });
      setState((s) => ({
        ...s,
        currentCase: s.currentCase?.id === caseId ? updated ?? s.currentCase : s.currentCase,
      }));
    },
    [state.session]
  );

  const addNote = useCallback(async (caseId: string, text: string) => {
    const session = state.session;
    const c = (await listCases()).find((x) => x.id === caseId);
    if (!c || !session) return;
    const note = {
      id: `note-${Date.now()}`,
      text,
      authorName: session.name,
      createdAt: new Date().toISOString(),
    };
    const ev = makeEvent("note_added", session.name, session.role, "Internal note added");
    const updated = await updateCase(caseId, {
      notes: [...c.notes, note],
      events: [...c.events, ev],
    });
    setState((s) => ({
      ...s,
      currentCase: s.currentCase?.id === caseId ? updated ?? s.currentCase : s.currentCase,
    }));
  }, [state.session]);

  const offerAppointment = useCallback(
    async (caseId: string, slot: AppointmentSlot) => {
      const session = state.session;
      const c = (await listCases()).find((x) => x.id === caseId);
      if (!c || !session) return;
      const ev = makeEvent(
        "appointment_offered",
        session.name,
        session.role,
        `Offered: ${slot.label}`
      );
      const updated = await updateCase(caseId, {
        offeredAppointment: slot,
        status: "appointment_offered",
        events: [...c.events, ev],
      });
      setState((s) => ({
        ...s,
        currentCase: s.currentCase?.id === caseId ? updated ?? s.currentCase : s.currentCase,
      }));
    },
    [state.session]
  );

  const setStatus = useCallback(
    async (caseId: string, status: CaseStatus) => {
      const session = state.session;
      const c = (await listCases()).find((x) => x.id === caseId);
      if (!c || !session) return;
      const ev = makeEvent("status_changed", session.name, session.role, `Status → ${status}`);
      const updated = await updateCase(caseId, {
        status,
        events: [...c.events, ev],
      });
      setState((s) => ({
        ...s,
        currentCase: s.currentCase?.id === caseId ? updated ?? s.currentCase : s.currentCase,
      }));
    },
    [state.session]
  );

  const submitRoutingFeedback = useCallback(
    async (caseId: string, feedback: RoutingFeedback) => {
      const c = (await listCases()).find((x) => x.id === caseId);
      if (!c) return;
      const session = state.session;
      const ev = makeEvent(
        "routing_feedback",
        session?.name ?? "staff",
        session?.role ?? "staff",
        feedback.correct ? "Routing correct" : `Routing incorrect — ${feedback.reason ?? ""}`
      );
      const updated = await updateCase(caseId, {
        routingFeedback: feedback,
        events: [...c.events, ev],
      });
      setState((s) => ({
        ...s,
        currentCase: s.currentCase?.id === caseId ? updated ?? s.currentCase : s.currentCase,
      }));
    },
    [state.session]
  );

  // ── Admin ───────────────────────────────────────────────────────────────────

  const goToAdmin = useCallback(() => {
    setState((s) => ({ ...s, screen: "admin" }));
  }, []);

  // ── General ─────────────────────────────────────────────────────────────────

  const resetToIntake = useCallback(() => {
    setState((s) => ({
      ...s,
      screen: "intake",
      currentCase: null,
      isLoading: false,
      error: null,
    }));
  }, []);

  const resetDemo = useCallback((seedCases: CaseRecord[]) => {
    resetToSeed(seedCases);
    setState((s) => ({ ...s, studentCases: [] }));
  }, []);

  const goToLanding = useCallback(() => {
    setState((s) => ({ ...s, screen: "landing" }));
  }, []);

  return (
    <AppContext.Provider
      value={{
        ...state,
        login,
        loginAsGuest,
        logout,
        loginStaff,
        logoutStaff,
        submitIntake,
        updateSegments,
        confirmHandoff,
        goToHandoff,
        goToMyRequests,
        revokeCase,
        goToQueue,
        goToStaff,
        acceptCase,
        reassignCase,
        addNote,
        offerAppointment,
        setStatus,
        acknowledgeCase,
        submitRoutingFeedback,
        logView,
        goToAdmin,
        resetToIntake,
        goToLanding,
        resetDemo,
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
