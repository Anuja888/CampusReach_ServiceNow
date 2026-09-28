/**
 * Stage engine unit tests — 8 scenarios.
 * Run with: npx vitest run src/lib/stages.test.ts
 */

import { describe, it, expect } from "vitest";
import { getStages } from "./stages";
import type { CaseRecord } from "@/types";
import { DEPARTMENTS } from "./routing";

// ── Minimal CaseRecord factory ────────────────────────────────────────────────

function makeCase(overrides: Partial<CaseRecord> = {}): CaseRecord {
  return {
    _v: 3,
    id: "test-001",
    createdAt: "2024-01-01T09:00:00Z",
    studentId: "STU001",
    studentName: "Test Student",
    submitted: true,
    status: "submitted",
    assignedTo: null,
    assignedDepartmentId: null,
    assignee: undefined,
    location: undefined,
    sla: undefined,
    firstViewedAt: undefined,
    events: [],
    notes: [],
    appointmentSlots: [],
    offeredAppointment: null,
    routingFeedback: null,
    revokedAt: null,
    acknowledgedAt: null,
    intakeData: { mainText: "test", contextText: "" },
    segments: [],
    scoringResult: {
      score: 5,
      urgencyLevel: "medium",
      primaryCategory: "academic_stress",
      secondaryCategory: null,
      matchedKeywords: [],
      isCrisis: false,
      source: "rules",
      evidencePhrases: [],
      needsHumanTriage: false,
    },
    routingResult: {
      department: DEPARTMENTS["wellbeing"],
      urgencyLevel: "medium",
      category: "academic_stress",
      secondaryCategory: null,
      explanation: "test",
      score: 5,
      matchedKeywords: [],
      isCrisis: false,
      source: "rules",
      evidencePhrases: [],
      needsHumanTriage: false,
    },
    ...overrides,
  };
}

function ev(type: CaseRecord["events"][0]["type"], actor = "Staff", ts = "2024-01-01T10:00:00Z") {
  return { id: `ev-${Math.random()}`, type, timestamp: ts, actor, actorRole: "staff" as const, visibleToStudent: true };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Stage engine", () => {

  it("1. Newly submitted — first stage done, rest upcoming", () => {
    const stages = getStages(makeCase());
    expect(stages[0].state).toBe("done");     // Submitted
    expect(stages[0].id).toBe("submitted");
    stages.slice(1).forEach((s) => expect(s.state).toBe("upcoming"));
    expect(stages[1].whatNext).toBeDefined();
  });

  it("2. After first staff view — Opened is current", () => {
    const c = makeCase({ events: [ev("viewed", "Dr. Sarah Okafor")] });
    const stages = getStages(c);
    const opened = stages.find((s) => s.id === "opened");
    expect(opened?.state).toBe("current");
    expect(opened?.label).toContain("Dr. Sarah Okafor");
  });

  it("3. After assign — Assigned is current, Opened is done", () => {
    const c = makeCase({
      status: "assigned",
      assignedTo: "Dr. Sarah Okafor",
      events: [ev("viewed", "Dr. Sarah Okafor"), ev("assigned", "Dr. Sarah Okafor", "2024-01-01T10:30:00Z")],
      assignee: { staffId: "s1", name: "Dr. Sarah Okafor", title: "Counsellor", department: "Wellbeing", email: "x@x.com" },
    });
    const stages = getStages(c);
    expect(stages.find((s) => s.id === "assigned")?.state).toBe("current");
    expect(stages.find((s) => s.id === "opened")?.state).toBe("done");
  });

  it("4. After appointment offered — Appointment is current", () => {
    const c = makeCase({
      status: "appointment_offered",
      offeredAppointment: { id: "slot-1", label: "Mon 28 Oct, 10:00", available: true },
      events: [ev("viewed"), ev("assigned"), ev("appointment_offered")],
    });
    const stages = getStages(c);
    expect(stages.find((s) => s.id === "appointment")?.state).toBe("current");
    expect(stages.find((s) => s.id === "appointment")?.label).toContain("Mon 28 Oct");
  });

  it("5. Resolved — all stages done", () => {
    const c = makeCase({
      status: "resolved",
      events: [ev("viewed"), ev("assigned"), ev("appointment_offered"), ev("status_changed")],
    });
    const stages = getStages(c);
    expect(stages.every((s) => s.state === "done")).toBe(true);
  });

  it("6. Withdrawn after first view — terminal Withdrawn stage appended", () => {
    const c = makeCase({
      status: "withdrawn",
      revokedAt: "2024-01-01T10:05:00Z",
      events: [ev("viewed"), ev("withdrawn", "Test Student", "2024-01-01T10:05:00Z")],
    });
    const stages = getStages(c);
    const last = stages[stages.length - 1];
    expect(last.id).toBe("withdrawn");
    expect(last.state).toBe("done");
    // No current stage should remain
    expect(stages.filter((s) => s.state === "current")).toHaveLength(0);
  });

  it("7. Rerouted human-triage case — shows rerouted stage", () => {
    const c = makeCase({
      events: [ev("viewed", "Kavya Reddy"), ev("rerouted", "Kavya Reddy")],
      routingResult: {
        ...makeCase().routingResult,
        department: DEPARTMENTS["human_triage"],
        needsHumanTriage: true,
      },
      scoringResult: { ...makeCase().scoringResult, needsHumanTriage: true },
    });
    const stages = getStages(c);
    const rerouted = stages.find((s) => s.id === "rerouted");
    expect(rerouted).toBeDefined();
    expect(rerouted?.state).toBe("done");
  });

  it("8. Crisis path — alert_sent is first stage", () => {
    const c = makeCase({
      events: [ev("alert_sent", "system")],
      scoringResult: { ...makeCase().scoringResult, isCrisis: true },
      routingResult: {
        ...makeCase().routingResult,
        department: DEPARTMENTS["crisis_line"],
        isCrisis: true,
      },
    });
    const stages = getStages(c);
    expect(stages[0].id).toBe("alert_sent");
    expect(stages[0].state).toBe("done");
    expect(stages[1].state).toBe("current"); // acknowledged
  });

});
