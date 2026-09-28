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
  department?: string;          // staff/admin display name
  departmentId?: string;        // maps to DEPARTMENTS key for queue scoping
  studentId?: string;
  year?: string;
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
  | "rerouted"            // step 2 addition
  | "escalated"
  | "note_added"
  | "appointment_offered"
  | "status_changed"
  | "routing_feedback"
  | "withdrawn"
  | "alert_sent";         // crisis auto-alert

export interface CaseEvent {
  id: string;
  type: CaseEventType;
  timestamp: string;
  actor: string;
  actorRole: UserRole | "system";
  actorName?: string;         // step 2: display name
  department?: string;        // step 2: department display name
  detail?: string;
  visibleToStudent: boolean;  // step 2: controls student activity feed
  metadata?: Record<string, unknown>;
}

export interface AppointmentSlot {
  id: string;
  label: string;
  available: boolean;
  mode?: "in_person" | "phone" | "video";  // step 2
  durationMins?: number;                   // step 2
  isoDateTime?: string;                    // step 2: for .ics generation
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

// ── Step-2 additions ──────────────────────────────────────────────────────────

export interface AssigneeInfo {
  staffId: string;
  name: string;
  title: string;
  department: string;
  email: string;
  phone?: string;
}

export interface LocationInfo {
  building: string;
  block?: string;
  floor?: string;
  room: string;
  officeHours: string;
  note?: string;
}

export interface SLAInfo {
  dueAt: string;              // ISO
  firstResponseAt?: string;   // ISO, set when first viewed by staff
}

// ── Case record (v3) ──────────────────────────────────────────────────────────
// Migration: store.ts fills safe defaults for any missing field.

export interface CaseRecord {
  _v: 3;
  id: string;
  createdAt: string;
  studentId: string | null;
  studentName: string | null;
  intakeData: IntakeFormData;
  scoringResult: ScoringResult;
  routingResult: RoutingResult;
  segments: TextSegment[];
  submitted: boolean;
  status: CaseStatus;
  assignedTo: string | null;             // staff display name (legacy)
  assignedDepartmentId: string | null;
  assignee?: AssigneeInfo;               // step 2: rich assignee
  location?: LocationInfo;               // step 2: where to go
  offeredAppointment: AppointmentSlot | null;
  sla?: SLAInfo;                         // step 2
  firstViewedAt?: string;                // step 2: ISO, set on first staff view
  events: CaseEvent[];
  notes: StaffNote[];
  appointmentSlots: AppointmentSlot[];
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
