/**
 * Stage engine — pure function, no side effects.
 * getStages(caseRecord) → ordered list of stages with state + metadata.
 *
 * Stage states: done | current | upcoming
 *
 * Paths:
 *   standard:      Submitted > Opened by staff > Assigned > Appointment > Resolved
 *   human_triage:  Submitted > Front Desk review > Rerouted to <dept> > Assigned > Appointment > Resolved
 *   crisis:        Alert sent > Acknowledged > Counsellor contacting you > Follow-up
 *   withdrawn:     terminal — inserts Withdrawn step after the last done step
 */

import type { CaseRecord, CaseEvent } from "@/types";

export type StageState = "done" | "current" | "upcoming";

export interface Stage {
  id: string;
  label: string;
  sublabel?: string;   // e.g. "Dr. Sarah Okafor, Wellbeing"
  state: StageState;
  timestamp?: string;  // ISO — when this step completed
  actor?: string;      // who triggered it
  whatNext?: string;   // plain-language "what happens next"
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function findEvent(events: CaseEvent[], type: CaseEvent["type"]): CaseEvent | undefined {
  return events.find((e) => e.type === type);
}

function latestEvent(events: CaseEvent[], type: CaseEvent["type"]): CaseEvent | undefined {
  return [...events].reverse().find((e) => e.type === type);
}

// ── Main function ─────────────────────────────────────────────────────────────

export function getStages(c: CaseRecord): Stage[] {
  const {
    status,
    events,
    scoringResult,
    routingResult,
    assignee,
    offeredAppointment,
    acknowledgedAt,
    firstViewedAt,
  } = c;

  const isWithdrawn = status === "withdrawn";
  const isCrisis = scoringResult.isCrisis;
  const isHumanTriage = routingResult.needsHumanTriage;

  // ── Crisis path ────────────────────────────────────────────────────────────
  if (isCrisis) {
    const alertEv  = findEvent(events, "alert_sent");
    const ackEv    = findEvent(events, "acknowledged");
    const assignEv = findEvent(events, "assigned");

    const stages: Stage[] = [
      {
        id: "alert_sent",
        label: "Alert sent",
        sublabel: "On-call counsellor notified",
        state: alertEv ? "done" : "current",
        timestamp: alertEv?.timestamp,
        actor: "system",
        whatNext: !alertEv ? "The on-call team has been notified and will respond within 5 minutes." : undefined,
      },
      {
        id: "acknowledged",
        label: "Acknowledged by on-call",
        sublabel: acknowledgedAt
          ? `Acknowledged at ${formatShortTime(acknowledgedAt)}`
          : undefined,
        state: acknowledgedAt ? "done" : alertEv ? "current" : "upcoming",
        timestamp: acknowledgedAt ?? undefined,
        actor: ackEv?.actor,
        whatNext: acknowledgedAt ? undefined : "Waiting for the counsellor to acknowledge.",
      },
      {
        id: "contacting",
        label: "Counsellor contacting you",
        state: assignEv ? "done" : acknowledgedAt ? "current" : "upcoming",
        timestamp: assignEv?.timestamp,
        actor: assignEv?.actor,
        whatNext: !assignEv && acknowledgedAt ? "The counsellor will reach out directly." : undefined,
      },
      {
        id: "followup",
        label: "Follow-up support",
        state: status === "resolved" ? "done" : assignEv ? "current" : "upcoming",
        whatNext: "Ongoing support will be arranged as needed.",
      },
    ];

    return applyWithdrawn(stages, events, isWithdrawn);
  }

  // ── Human-triage path ──────────────────────────────────────────────────────
  if (isHumanTriage) {
    const viewEv   = findEvent(events, "viewed");
    const rerouteEv = findEvent(events, "rerouted") ?? findEvent(events, "reassigned");
    const assignEv = findEvent(events, "assigned");
    const apptEv   = findEvent(events, "appointment_offered");

    const reroutedTo = rerouteEv?.detail
      ? rerouteEv.detail
      : assignee?.department ?? routingResult.department.name;

    const stages: Stage[] = [
      {
        id: "submitted",
        label: "Submitted",
        state: "done",
        timestamp: c.createdAt,
        actor: c.studentName ?? "Student",
      },
      {
        id: "frontdesk",
        label: "Front Desk review",
        sublabel: viewEv ? `Opened by ${viewEv.actor}` : undefined,
        state: rerouteEv ? "done" : viewEv ? "current" : "upcoming",
        timestamp: viewEv?.timestamp,
        actor: viewEv?.actor,
        whatNext: !viewEv
          ? "The Front Desk team will review your message and connect you with the right support."
          : !rerouteEv
          ? "The Front Desk is reviewing your case now."
          : undefined,
      },
      {
        id: "rerouted",
        label: rerouteEv ? `Rerouted to ${reroutedTo}` : "Rerouted to specialist",
        state: rerouteEv ? "done" : viewEv ? "current" : "upcoming",
        timestamp: rerouteEv?.timestamp,
        actor: rerouteEv?.actor,
        whatNext: !rerouteEv && viewEv ? "Your case will be assigned to the most appropriate team." : undefined,
      },
      ...commonTailStages(assignEv, apptEv, status, assignee, offeredAppointment),
    ];

    return applyWithdrawn(stages, events, isWithdrawn);
  }

  // ── Standard path ─────────────────────────────────────────────────────────
  const viewEv  = findEvent(events, "viewed");
  const assignEv = findEvent(events, "assigned");
  const apptEv   = findEvent(events, "appointment_offered");

  const stages: Stage[] = [
    {
      id: "submitted",
      label: "Submitted",
      state: "done",
      timestamp: c.createdAt,
      actor: c.studentName ?? "Student",
    },
    {
      id: "opened",
      label: viewEv ? `Opened by ${viewEv.actor}` : "Opened by staff",
      sublabel: viewEv ? formatShortTime(viewEv.timestamp) : undefined,
      state: assignEv ? "done" : viewEv ? "current" : "upcoming",
      timestamp: viewEv?.timestamp,
      actor: viewEv?.actor,
      whatNext: !viewEv
        ? `The ${routingResult.department.shortName} team will open your case soon.`
        : !assignEv
        ? "Your case is being reviewed."
        : undefined,
    },
    ...commonTailStages(assignEv, apptEv, status, assignee, offeredAppointment),
  ];

  return applyWithdrawn(stages, events, isWithdrawn);
}

// ── Shared tail stages (Assigned → Appointment → Resolved) ───────────────────

function commonTailStages(
  assignEv: CaseEvent | undefined,
  apptEv: CaseEvent | undefined,
  status: CaseRecord["status"],
  assignee: CaseRecord["assignee"],
  offeredAppointment: CaseRecord["offeredAppointment"]
): Stage[] {
  return [
    {
      id: "assigned",
      label: assignEv
        ? `Assigned to ${assignee?.name ?? assignEv.actor}`
        : "Assigned",
      sublabel: assignee?.department,
      state: apptEv || status === "resolved" ? "done" : assignEv ? "current" : "upcoming",
      timestamp: assignEv?.timestamp,
      actor: assignEv?.actor,
      whatNext: !assignEv
        ? "A staff member will be assigned to your case."
        : !apptEv && status !== "resolved"
        ? `${assignee?.name ?? "Your advisor"} will be in touch to arrange a meeting.`
        : undefined,
    },
    {
      id: "appointment",
      label: offeredAppointment
        ? `Appointment offered — ${offeredAppointment.label}`
        : "Appointment offered",
      state: status === "resolved" ? "done" : apptEv ? "current" : "upcoming",
      timestamp: apptEv?.timestamp,
      actor: apptEv?.actor,
      whatNext: !apptEv && assignEv
        ? "An appointment date and time will be offered shortly."
        : apptEv && status !== "resolved"
        ? "Please confirm your appointment slot."
        : undefined,
    },
    {
      id: "resolved",
      label: "Resolved",
      state: status === "resolved" ? "done" : "upcoming",
      timestamp: status === "resolved"
        ? ([...([])].reverse().find(() => true) ?? undefined)
        : undefined,
      whatNext: status !== "resolved" ? "Your request will be marked resolved once support is complete." : undefined,
    },
  ];
}

// ── Withdrawn terminal step ───────────────────────────────────────────────────

function applyWithdrawn(
  stages: Stage[],
  events: CaseEvent[],
  isWithdrawn: boolean
): Stage[] {
  if (!isWithdrawn) return stages;

  const withdrawEv = findEvent(events, "withdrawn");

  // Mark all "current" stages as "upcoming", then append terminal Withdrawn
  return [
    ...stages.map((s) => ({
      ...s,
      state: (s.state === "current" ? "upcoming" : s.state) as StageState,
      whatNext: undefined,
    })),
    {
      id: "withdrawn",
      label: "Withdrawn",
      sublabel: "Request cancelled by student",
      state: "done" as StageState,
      timestamp: withdrawEv?.timestamp,
      actor: withdrawEv?.actor,
    },
  ];
}

// ── Formatting ────────────────────────────────────────────────────────────────

function formatShortTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
