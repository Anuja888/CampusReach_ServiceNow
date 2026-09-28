import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type {
  AppointmentSlot,
  AssigneeInfo,
  CaseEvent,
  CaseRecord,
  CaseStatus,
  IntakeFormData,
  RoutingFeedback,
  TextSegment,
  UserSession,
} from "@/types";
import { SLA_MINUTES } from "@/types";
import { classifyText } from "./classify";
import { routeCase, splitIntoSegments, DEPARTMENTS } from "./routing";
import {
  forceRehydrate,
  generateEventId,
  getCasesByStudent,
  listCases,
  resetToSeed,
  saveCase,
  updateCase,
} from "./store";
import {
  clearSession,
  clearAttempts,
  continueAsGuest,
  getStoredSession,
  persistSession,
  recordFailedAttempt,
  registerStudent,
  touchSession,
  loginWithCredentials,
} from "./auth";
import { getLocationForDepartment } from "@/data/staffDirectory";

// ── Screen union ──────────────────────────────────────────────────────────────

export type AppScreen =
  | "landing"           // login screen (replaces old LandingScreen)
  | "intake"
  | "processing"
  | "crisis"
  | "result"
  | "handoff"
  | "my-requests"
  | "request-detail"    // step 3: full Request Status view
  | "staff-login"       // legacy → redirects to landing
  | "queue"
  | "staff"
  | "admin";

// ── State ─────────────────────────────────────────────────────────────────────

interface AppState {
  screen: AppScreen;
  session: UserSession | null;
  currentCase: CaseRecord | null;
  currentDetailCaseId: string | null;  // for request-detail screen
  studentCases: CaseRecord[];
  isLoading: boolean;
  error: string | null;
  pendingCase: Omit<CaseRecord, "id" | "createdAt" | "_v"> | null; // guest pending
  // legacy alias
  staffSession: { name: string; department: string } | null;
}

interface AppContextValue extends AppState {
  // Auth
  login: (email: string, password: string) => Promise<{ ok: boolean; attemptsLeft?: number; lockedUntil?: number | null }>;
  loginAsGuest: () => void;
  logout: () => void;
  register: (params: { name: string; email: string; password: string }) => Promise<{ ok: boolean; error?: string }>;
  goToCrisisResources: () => void;
  touchActivity: () => void;
  // Legacy compat
  loginStaff: (email: string, password: string) => boolean;
  logoutStaff: () => void;

  // Student flow
  submitIntake: (data: IntakeFormData) => Promise<void>;
  updateSegments: (segments: TextSegment[]) => void;
  confirmHandoff: () => Promise<void>;
  goToHandoff: () => void;
  goToMyRequests: () => void;
  openRequestDetail: (caseId: string) => void;
  revokeCase: (caseId: string) => Promise<void>;
  refreshStudentCases: () => Promise<void>;

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
  escalateCase: (caseId: string, reason: string) => Promise<void>;
  assignToColleague: (caseId: string, assigneeInfo: AssigneeInfo) => Promise<void>;

  // Admin
  goToAdmin: () => void;

  // Navigation
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
  visibleToStudent = false,
  metadata?: Record<string, unknown>
): CaseEvent {
  return {
    id: generateEventId(),
    type,
    timestamp: new Date().toISOString(),
    actor,
    actorName: actor,
    actorRole,
    detail,
    visibleToStudent,
    metadata,
  };
}

const MOCK_APPOINTMENT_SLOTS: AppointmentSlot[] = [
  { id: "slot-1", label: "Mon 28 Oct, 10:00–10:30", available: true, mode: "in_person", durationMins: 30, isoDateTime: "2024-10-28T10:00:00" },
  { id: "slot-2", label: "Tue 29 Oct, 14:00–14:30", available: true, mode: "in_person", durationMins: 30, isoDateTime: "2024-10-29T14:00:00" },
  { id: "slot-3", label: "Wed 30 Oct, 11:00–11:30", available: true, mode: "phone", durationMins: 30, isoDateTime: "2024-10-30T11:00:00" },
];

/** Compute SLA dueAt from case creation time and urgency */
function computeSLADueAt(createdAt: string, urgencyLevel: keyof typeof SLA_MINUTES): string {
  const ms = SLA_MINUTES[urgencyLevel] * 60 * 1000;
  return new Date(new Date(createdAt).getTime() + ms).toISOString();
}

// ── Route guard helper ────────────────────────────────────────────────────────
// Returns the screen the user is actually allowed to land on

function guardedScreen(
  desired: AppScreen,
  session: UserSession | null
): AppScreen {
  const role = session?.role ?? "guest";

  // student-only screens
  if (["my-requests", "request-detail"].includes(desired) && role !== "student") {
    return role === "guest" ? "landing" : "intake";
  }
  // staff/admin only screens
  if (["queue", "staff"].includes(desired) && role !== "staff" && role !== "admin") {
    return role === "student" ? "intake" : "landing";
  }
  // admin only
  if (desired === "admin" && role !== "admin") {
    return role === "staff" ? "queue" : "landing";
  }
  // staff-login redirects to landing
  if (desired === "staff-login") return "landing";

  return desired;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const storedSession = getStoredSession();

  const [state, setState] = useState<AppState>({
    screen: "landing",
    session: storedSession,
    currentCase: null,
    currentDetailCaseId: null,
    studentCases: [],
    isLoading: false,
    error: null,
    pendingCase: null,
    staffSession:
      storedSession?.role === "staff" || storedSession?.role === "admin"
        ? { name: storedSession.name, department: storedSession.department ?? "" }
        : null,
  });

  // Touch session activity on user interaction
  const touchActivity = useCallback(() => {
    touchSession();
  }, []);

  // Load student cases when session changes
  useEffect(() => {
    if (state.session?.role === "student" && state.session.studentId) {
      getCasesByStudent(state.session.studentId).then((cases) => {
        setState((s) => ({ ...s, studentCases: cases }));
      });
    }
  }, [state.session?.id]);

  // BroadcastChannel + storage listener for cross-tab sync (step 5)
  useEffect(() => {
    let bc: BroadcastChannel | null = null;

    function onMessage() {
      const updated = forceRehydrate();
      setState((s) => {
        if (!s.session?.studentId) return { ...s };
        const studentCases = updated.filter((c) => c.studentId === s.session!.studentId);
        const currentCase = s.currentCase
          ? (updated.find((c) => c.id === s.currentCase!.id) ?? s.currentCase)
          : null;
        return { ...s, studentCases, currentCase };
      });
    }

    function onStorage(e: StorageEvent) {
      if (e.key === "campusreach_cases") onMessage();
    }

    try {
      bc = new BroadcastChannel("campusreach");
      bc.onmessage = onMessage;
    } catch { /* not supported */ }

    window.addEventListener("storage", onStorage);
    return () => {
      bc?.close();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // ── Auth ────────────────────────────────────────────────────────────────────

  const login = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ ok: boolean; attemptsLeft?: number; lockedUntil?: number | null }> => {
      const session = await loginWithCredentials(email, password);
      if (!session) {
        const { lockedUntil, attemptsLeft } = recordFailedAttempt(email);
        return { ok: false, attemptsLeft, lockedUntil };
      }

      clearAttempts(email);
      persistSession(session);

      setState((s) => ({
        ...s,
        session,
        staffSession:
          session.role === "staff" || session.role === "admin"
            ? { name: session.name, department: session.department ?? "" }
            : null,
        screen:
          session.role === "staff" || session.role === "admin" ? "queue" : "intake",
        error: null,
      }));
      return { ok: true };
    },
    []
  );

  const loginAsGuest = useCallback(() => {
    const session = continueAsGuest();
    setState((s) => ({ ...s, session, screen: "intake", staffSession: null, error: null }));
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setState({
      screen: "landing",
      session: null,
      staffSession: null,
      currentCase: null,
      currentDetailCaseId: null,
      studentCases: [],
      isLoading: false,
      error: null,
      pendingCase: null,
    });
  }, []);

  const register = useCallback(
    async (params: { name: string; email: string; password: string }) => {
      const result = await registerStudent(params);
      if (!result.ok) return result;
      setState((s) => ({
        ...s,
        session: result.session,
        staffSession: null,
        screen: "intake",
        error: null,
      }));
      return { ok: true as const };
    },
    []
  );

  const goToCrisisResources = useCallback(() => {
    // Show crisis screen without creating a case
    setState((s) => ({
      ...s,
      screen: "crisis",
      currentCase: null,
    }));
  }, []);

  // Legacy compat
  const loginStaff = useCallback(
    (email: string, password: string): boolean => {
      login(email, password);
      return true;
    },
    [login]
  );
  const logoutStaff = useCallback(() => { logout(); }, [logout]);

  // ── Student flow ────────────────────────────────────────────────────────────

  const submitIntake = useCallback(
    async (data: IntakeFormData) => {
      setState((s) => ({ ...s, isLoading: true, error: null, screen: "processing" }));

      try {
        const scoringResult = await classifyText(
          `${data.mainText} ${data.contextText}`.trim()
        );
        const routingResult = await routeCase(scoringResult);
        const segments = splitIntoSegments(data.mainText);

        const session = state.session;
        const isGuest = !session || session.role === "guest";

        // Crisis + guest: show crisis screen, no case saved
        if (scoringResult.isCrisis && isGuest) {
          const ephemeral: CaseRecord = {
            _v: 3,
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
          };
          setState((s) => ({
            ...s,
            screen: "crisis",
            currentCase: ephemeral,
            isLoading: false,
            error: null,
          }));
          return;
        }

        const now = new Date().toISOString();
        const events: CaseEvent[] = [
          makeEvent("submitted", session?.name ?? "Student", session?.role ?? "student", undefined, true),
          makeEvent("scored", "system", "system", `Score: ${scoringResult.score}, source: ${scoringResult.source}`, false),
        ];
        if (scoringResult.source === "ai" || scoringResult.source === "ai_cached") {
          events.push(makeEvent("ai_classified", "system", "system", `Confidence: ${scoringResult.aiConfidence}`, false));
        }
        events.push(makeEvent("routed", "system", "system", `Routed to ${routingResult.department.name}`, true));

        // Crisis + signed-in: create case with alert_sent
        if (scoringResult.isCrisis) {
          events.push(makeEvent("alert_sent", "system", "system", "On-call counsellor notified", true));
        }

        const slaInfo = {
          dueAt: computeSLADueAt(now, scoringResult.urgencyLevel),
        };

        const caseData: Omit<CaseRecord, "id" | "createdAt" | "_v"> = {
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
          sla: slaInfo,
        };

        if (isGuest) {
          // Store pending case; after sign-in confirmHandoff will complete
          setState((s) => ({
            ...s,
            screen: scoringResult.isCrisis ? "crisis" : "result",
            currentCase: { ...caseData, _v: 3, id: "pending", createdAt: now } as CaseRecord,
            pendingCase: caseData,
            isLoading: false,
            error: null,
          }));
          return;
        }

        const record = await saveCase(caseData);

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
    },
    [state.session]
  );

  const updateSegments = useCallback((segments: TextSegment[]) => {
    setState((s) => {
      if (!s.currentCase) return s;
      return { ...s, currentCase: { ...s.currentCase, segments } };
    });
  }, []);

  const confirmHandoff = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const { currentCase, session, pendingCase } = state;

      // Guest with pending case: sign in required (caller should have redirected)
      // If we reach here with a pending case but a session, complete the save
      let record: CaseRecord | null = currentCase ?? null;

      if (pendingCase && session && session.role !== "guest") {
        const saved = await saveCase({
          ...pendingCase,
          studentId: session.studentId ?? null,
          studentName: session.name,
        });
        record = saved;
      }

      if (record && record.id !== "guest-crisis" && record.id !== "pending") {
        const consentEv = makeEvent(
          "consent_reviewed",
          session?.name ?? "Student",
          session?.role ?? "student",
          undefined,
          false
        );
        const updated = await updateCase(record.id, {
          submitted: true,
          status: "triaged",
          events: [...(record.events ?? []), consentEv],
        });

        if (session?.studentId) {
          const cases = await getCasesByStudent(session.studentId);
          setState((s) => ({
            ...s,
            isLoading: false,
            screen: "my-requests",
            currentCase: updated ?? record,
            studentCases: cases,
            pendingCase: null,
          }));
        } else {
          setState((s) => ({
            ...s,
            isLoading: false,
            screen: "result",
            currentCase: updated ?? record,
            pendingCase: null,
          }));
        }
      } else {
        setState((s) => ({ ...s, isLoading: false, screen: "intake", pendingCase: null }));
      }
    } catch {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, [state]);

  const goToHandoff = useCallback(() => {
    setState((s) => {
      // If guest with a non-crisis case, redirect to landing with pending state
      if (!s.session || s.session.role === "guest") {
        return { ...s, screen: "landing" };
      }
      return { ...s, screen: "handoff" };
    });
  }, []);

  const goToMyRequests = useCallback(() => {
    setState((s) => ({ ...s, screen: guardedScreen("my-requests", s.session) }));
  }, []);

  const openRequestDetail = useCallback((caseId: string) => {
    setState((s) => ({
      ...s,
      screen: guardedScreen("request-detail", s.session),
      currentDetailCaseId: caseId,
    }));
  }, []);

  const revokeCase = useCallback(
    async (caseId: string) => {
      const { session, studentCases } = state;
      const c = studentCases.find((x) => x.id === caseId);
      if (!c) return;
      const ev = makeEvent("withdrawn", session?.name ?? "Student", "student", "Revoked by student", true);
      await updateCase(caseId, {
        status: "withdrawn",
        revokedAt: new Date().toISOString(),
        events: [...c.events, ev],
      });
      if (session?.studentId) {
        const cases = await getCasesByStudent(session.studentId);
        setState((s) => ({ ...s, studentCases: cases }));
      }
    },
    [state]
  );

  const refreshStudentCases = useCallback(async () => {
    const { session } = state;
    if (!session?.studentId) return;
    const cases = await getCasesByStudent(session.studentId);
    setState((s) => ({ ...s, studentCases: cases }));
  }, [state.session]);

  // ── Staff flow ──────────────────────────────────────────────────────────────

  const goToQueue = useCallback(() => {
    setState((s) => ({ ...s, screen: guardedScreen("queue", s.session) }));
  }, []);

  const goToStaff = useCallback((caseRecord?: CaseRecord) => {
    setState((s) => ({
      ...s,
      screen: guardedScreen("staff", s.session),
      currentCase: caseRecord !== undefined ? caseRecord : s.currentCase,
    }));
  }, []);

  const logView = useCallback(
    async (caseId: string) => {
      const { session } = state;
      if (!session) return;
      const all = await listCases();
      const c = all.find((x) => x.id === caseId);
      if (!c) return;

      const now = new Date().toISOString();

      // Dedupe: same staff within 5 minutes
      const recentView = c.events.find(
        (e) =>
          e.type === "viewed" &&
          e.actor === session.name &&
          Date.now() - new Date(e.timestamp).getTime() < 5 * 60 * 1000
      );
      if (recentView) return;

      const ev = makeEvent("viewed", session.name, session.role, undefined, true);

      const isFirstView = !c.firstViewedAt;
      const patch: Partial<CaseRecord> = {
        events: [...c.events, ev],
        firstViewedAt: isFirstView ? now : c.firstViewedAt,
        sla: isFirstView
          ? { ...(c.sla ?? { dueAt: now }), firstResponseAt: now }
          : c.sla,
      };

      const updated = await updateCase(caseId, patch);
      setState((s) => {
        if (s.currentCase?.id === caseId) return { ...s, currentCase: updated ?? s.currentCase };
        return s;
      });
    },
    [state.session]
  );

  const acknowledgeCase = useCallback(
    async (caseId: string) => {
      const { session } = state;
      const all = await listCases();
      const c = all.find((x) => x.id === caseId);
      if (!c || !session) return;
      const now = new Date().toISOString();
      const ev = makeEvent("acknowledged", session.name, session.role, "Crisis acknowledged", true);
      const updated = await updateCase(caseId, {
        acknowledgedAt: now,
        status: "triaged",
        events: [...c.events, ev],
      });
      setState((s) => ({
        ...s,
        currentCase: s.currentCase?.id === caseId ? updated ?? s.currentCase : s.currentCase,
      }));
    },
    [state.session]
  );

  const acceptCase = useCallback(
    async (caseId: string) => {
      const { session } = state;
      const all = await listCases();
      const c = all.find((x) => x.id === caseId);
      if (!c || !session) return;

      const location = session.departmentId
        ? getLocationForDepartment(session.departmentId)
        : undefined;

      const assigneeInfo: AssigneeInfo = {
        staffId: session.id,
        name: session.name,
        title: session.department ?? "Staff",
        department: session.department ?? "",
        email: session.email,
      };

      const ev = makeEvent("assigned", session.name, session.role, `Accepted by ${session.name}`, true);
      const updated = await updateCase(caseId, {
        assignedTo: session.name,
        assignedDepartmentId: session.departmentId ?? null,
        assignee: assigneeInfo,
        location,
        status: "assigned",
        events: [...c.events, ev],
      });
      setState((s) => ({
        ...s,
        currentCase: s.currentCase?.id === caseId ? updated ?? s.currentCase : s.currentCase,
      }));
    },
    [state.session]
  );

  const reassignCase = useCallback(
    async (caseId: string, departmentId: string, reason: string) => {
      const { session } = state;
      const all = await listCases();
      const c = all.find((x) => x.id === caseId);
      if (!c || !session) return;

      const dept = DEPARTMENTS[departmentId];
      const location = getLocationForDepartment(departmentId);

      const ev = makeEvent("rerouted", session.name, session.role, reason, true, { departmentId });
      const updated = await updateCase(caseId, {
        assignedDepartmentId: departmentId,
        assignedTo: null,
        assignee: undefined,
        location,
        routingResult: { ...c.routingResult, department: dept ?? c.routingResult.department },
        events: [...c.events, ev],
      });
      setState((s) => ({
        ...s,
        currentCase: s.currentCase?.id === caseId ? updated ?? s.currentCase : s.currentCase,
      }));
    },
    [state.session]
  );

  const assignToColleague = useCallback(
    async (caseId: string, assigneeInfo: AssigneeInfo) => {
      const { session } = state;
      const all = await listCases();
      const c = all.find((x) => x.id === caseId);
      if (!c || !session) return;

      const ev = makeEvent("assigned", session.name, session.role, `Assigned to ${assigneeInfo.name}`, true);
      const updated = await updateCase(caseId, {
        assignedTo: assigneeInfo.name,
        assignee: assigneeInfo,
        status: "assigned",
        events: [...c.events, ev],
      });
      setState((s) => ({
        ...s,
        currentCase: s.currentCase?.id === caseId ? updated ?? s.currentCase : s.currentCase,
      }));
    },
    [state.session]
  );

  const escalateCase = useCallback(
    async (caseId: string, reason: string) => {
      const { session } = state;
      const all = await listCases();
      const c = all.find((x) => x.id === caseId);
      if (!c || !session) return;
      const ev = makeEvent("escalated", session.name, session.role, reason, true);
      const updated = await updateCase(caseId, { events: [...c.events, ev] });
      setState((s) => ({
        ...s,
        currentCase: s.currentCase?.id === caseId ? updated ?? s.currentCase : s.currentCase,
      }));
    },
    [state.session]
  );

  const addNote = useCallback(
    async (caseId: string, text: string) => {
      const { session } = state;
      const all = await listCases();
      const c = all.find((x) => x.id === caseId);
      if (!c || !session) return;
      const note = {
        id: `note-${Date.now()}`,
        text,
        authorName: session.name,
        createdAt: new Date().toISOString(),
      };
      const ev = makeEvent("note_added", session.name, session.role, "Internal note added", false);
      const updated = await updateCase(caseId, {
        notes: [...c.notes, note],
        events: [...c.events, ev],
      });
      setState((s) => ({
        ...s,
        currentCase: s.currentCase?.id === caseId ? updated ?? s.currentCase : s.currentCase,
      }));
    },
    [state.session]
  );

  const offerAppointment = useCallback(
    async (caseId: string, slot: AppointmentSlot) => {
      const { session } = state;
      const all = await listCases();
      const c = all.find((x) => x.id === caseId);
      if (!c || !session) return;
      const ev = makeEvent("appointment_offered", session.name, session.role, `Offered: ${slot.label}`, true);
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
      const { session } = state;
      const all = await listCases();
      const c = all.find((x) => x.id === caseId);
      if (!c || !session) return;
      const ev = makeEvent("status_changed", session.name, session.role, `Status → ${status}`, true);
      const updated = await updateCase(caseId, { status, events: [...c.events, ev] });
      setState((s) => ({
        ...s,
        currentCase: s.currentCase?.id === caseId ? updated ?? s.currentCase : s.currentCase,
      }));
    },
    [state.session]
  );

  const submitRoutingFeedback = useCallback(
    async (caseId: string, feedback: RoutingFeedback) => {
      const all = await listCases();
      const c = all.find((x) => x.id === caseId);
      if (!c) return;
      const ev = makeEvent(
        "routing_feedback",
        state.session?.name ?? "staff",
        state.session?.role ?? "staff",
        feedback.correct ? "Routing correct" : `Incorrect — ${feedback.reason ?? ""}`,
        false
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
    setState((s) => ({ ...s, screen: guardedScreen("admin", s.session) }));
  }, []);

  // ── General ─────────────────────────────────────────────────────────────────

  const resetToIntake = useCallback(() => {
    setState((s) => ({ ...s, screen: "intake", currentCase: null, isLoading: false, error: null }));
  }, []);

  const goToLanding = useCallback(() => {
    setState((s) => ({ ...s, screen: "landing" }));
  }, []);

  const resetDemo = useCallback((seedCases: CaseRecord[]) => {
    resetToSeed(seedCases);
    setState((s) => ({ ...s, studentCases: [] }));
  }, []);

  // ── Value ────────────────────────────────────────────────────────────────────

  return (
    <AppContext.Provider
      value={{
        ...state,
        login,
        loginAsGuest,
        logout,
        register,
        goToCrisisResources,
        touchActivity,
        loginStaff,
        logoutStaff,
        submitIntake,
        updateSegments,
        confirmHandoff,
        goToHandoff,
        goToMyRequests,
        openRequestDetail,
        revokeCase,
        refreshStudentCases,
        goToQueue,
        goToStaff,
        acceptCase,
        reassignCase,
        assignToColleague,
        escalateCase,
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
