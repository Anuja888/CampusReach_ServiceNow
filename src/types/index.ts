// ── Core enums ────────────────────────────────────────────────────────────────

export type UrgencyLevel = "low" | "medium" | "high" | "crisis";

export type Category =
  | "mental_health"
  | "academic_stress"
  | "financial"
  | "housing"
  | "crisis"
  | "physical_health"
  | "social_isolation"
  | "general";

export type ClassificationSource =
  | "rules"
  | "ai"
  | "ai_cached"
  | "human";

export type UserRole = "student" | "staff" | "admin" | "guest";

export type CaseStatus =
  | "submitted"
  | "triaged"
  | "assigned"
  | "appointment_offered"
  | "resolved"
  | "withdrawn";

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;          // staff/admin only
  studentId?: string;           // student only
  year?: string;                // student only
}

// ── Scoring ───────────────────────────────────────────────────────────────────

export interface MatchedKeyword {
  word: string;
  weight: number;
  category: Category;
}

export interface ScoringResult {
  score: number;
  urgencyLevel: UrgencyLevel;
  primaryCategory: Category;
  secondaryCategory: Category | null;
  matchedKeywords: MatchedKeyword[];
  isCrisis: boolean;
  source: ClassificationSource;
  aiConfidence?: number;
  evidencePhrases: string[];
  needsHumanTriage: boolean;
}

// ── Routing ───────────────────────────────────────────────────────────────────

export interface Department {
  id: string;
  name: string;
  shortName: string;
  description: string;
  contact: string;
  typicalWait: string;
  color: string;
  capacity?: number;
  openCases?: number;
}

export interface RoutingResult {
  department: Department;
  urgencyLevel: UrgencyLevel;
  category: Category;
  secondaryCategory: Category | null;
  explanation: string;
  score: number;
  matchedKeywords: MatchedKeyword[];
  isCrisis: boolean;
  source: ClassificationSource;
  aiConfidence?: number;
  evidencePhrases: string[];
  needsHumanTriage: boolean;
}

// ── Case lifecycle ────────────────────────────────────────────────────────────

export type CaseEventType =
  | "submitted"
  | "scored"
  | "ai_classified"
  | "routed"
  | "consent_reviewed"
  | "consent_skipped_crisis"
  | "viewed"
  | "acknowledged"
  | "assigned"
  | "reassigned"
  | "escalated"
  | "note_added"
  | "appointment_offered"
  | "status_changed"
  | "routing_feedback"
  | "withdrawn";

export interface CaseEvent {
  id: string;
  type: CaseEventType;
  timestamp: string;
  actor: string;         // "system", staff name, student name
  actorRole: UserRole | "system";
  detail?: string;       // human-readable detail
  metadata?: Record<string, unknown>;
}

export interface AppointmentSlot {
  id: string;
  label: string;          // e.g. "Mon 2 Oct, 10:00–10:30"
  available: boolean;
}

export interface StaffNote {
  id: string;
  text: string;
  authorName: string;
  createdAt: string;
}

export interface RoutingFeedback {
  correct: boolean;
  suggestedDepartmentId?: string;
  reason?: string;
  submittedAt: string;
  submittedBy: string;
}

// ── Intake + segments ─────────────────────────────────────────────────────────

export interface IntakeFormData {
  mainText: string;
  contextText: string;
}

export interface TextSegment {
  id: string;
  text: string;
  included: boolean;
  isSensitive: boolean;
}

// ── Case record (v2) ──────────────────────────────────────────────────────────

export interface CaseRecord {
  _v: 2;
  id: string;
  createdAt: string;
  studentId: string | null;         // null for guests
  studentName: string | null;       // display only
  intakeData: IntakeFormData;
  scoringResult: ScoringResult;
  routingResult: RoutingResult;
  segments: TextSegment[];
  submitted: boolean;
  status: CaseStatus;
  assignedTo: string | null;        // staff name
  assignedDepartmentId: string | null;
  events: CaseEvent[];
  notes: StaffNote[];
  appointmentSlots: AppointmentSlot[];
  offeredAppointment: AppointmentSlot | null;
  routingFeedback: RoutingFeedback | null;
  revokedAt: string | null;
  acknowledgedAt: string | null;
}

// ── SLA ───────────────────────────────────────────────────────────────────────

export const SLA_MINUTES: Record<UrgencyLevel, number> = {
  crisis: 5,
  high: 240,
  medium: 1440,
  low: 4320,
};
