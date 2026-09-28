import { useEffect, useState } from "react";
import {
  AlertTriangle, Building2, Calendar, CheckCircle2, Clock,
  EyeOff, Info, List, LogOut, MessageSquarePlus, RotateCcw,
  Shield, ShieldAlert, ThumbsDown, ThumbsUp, User, UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/lib/AppContext";
import { DEPARTMENTS } from "@/lib/routing";
import type { AppointmentSlot, CaseStatus, UrgencyLevel } from "@/types";

const URGENCY_BORDER: Record<UrgencyLevel, string> = {
  low: "border-l-emerald-400", medium: "border-l-amber-400",
  high: "border-l-red-500", crisis: "border-l-amber-600",
};
const URGENCY_BADGE: Record<UrgencyLevel, "low" | "medium" | "high" | "crisis"> = {
  low: "low", medium: "medium", high: "high", crisis: "crisis",
};

const SLA_MINS: Record<UrgencyLevel, number> = {
  crisis: 5, high: 240, medium: 1440, low: 4320,
};

const STATUS_LABEL: Record<CaseStatus, string> = {
  submitted: "Submitted", triaged: "Triaged", assigned: "Assigned",
  appointment_offered: "Appointment offered", resolved: "Resolved", withdrawn: "Withdrawn",
};

function formatCategory(cat: string): string {
  return cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit", minute: "2-digit", day: "numeric", month: "short",
    }).format(new Date(iso));
  } catch { return iso; }
}

export function StaffView() {
  const {
    currentCase, resetToIntake, goToQueue, logoutStaff, staffSession, session,
    acceptCase, reassignCase, addNote, offerAppointment, setStatus,
    acknowledgeCase, submitRoutingFeedback, logView,
  } = useApp();

  const [noteText, setNoteText] = useState("");
  const [reassignDept, setReassignDept] = useState("");
  const [reassignReason, setReassignReason] = useState("");
  const [showReassign, setShowReassign] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Log view once on mount
  useEffect(() => {
    if (currentCase) {
      logView(currentCase.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCase?.id]);

  if (!currentCase) return null;

  const { routingResult, scoringResult, segments, intakeData, createdAt, id, status,
    assignedTo, notes, events, offeredAppointment, routingFeedback, acknowledgedAt } = currentCase;
  const { department, urgencyLevel, explanation, matchedKeywords, category,
    secondaryCategory, source, aiConfidence, evidencePhrases, score, needsHumanTriage } = routingResult;

  const isCrisis = scoringResult.isCrisis;
  const includedSegments = segments.filter((s) => s.included);
  const restrictedCount = segments.filter((s) => !s.included).length;

  const displayName = staffSession?.name ?? session?.name ?? "Dr. Sarah Okafor";
  const displayDept = staffSession?.department ?? session?.department ?? "Student Wellbeing Service";

  // SLA
  const elapsed = (Date.now() - new Date(createdAt).getTime()) / 60000;
  const slaLimit = SLA_MINS[urgencyLevel];
  const slaOverdue = elapsed > slaLimit;
  const slaRemaining = Math.max(0, slaLimit - elapsed);
  const slaLabel = slaOverdue
    ? `Overdue ${Math.round(elapsed - slaLimit)}m`
    : slaRemaining < 60
    ? `${Math.round(slaRemaining)}m left`
    : `${Math.round(slaRemaining / 60)}h left`;

  async function handleAccept() { await acceptCase(id); }
  async function handleAcknowledge() { await acknowledgeCase(id); }
  async function handleNote() {
    if (!noteText.trim()) return;
    await addNote(id, noteText.trim());
    setNoteText("");
  }
  async function handleReassign() {
    if (!reassignDept || !reassignReason.trim()) return;
    await reassignCase(id, reassignDept, reassignReason.trim());
    setShowReassign(false);
    setReassignReason("");
  }
  async function handleOffer(slot: AppointmentSlot) {
    await offerAppointment(id, slot);
  }
  async function handleStatus(s: CaseStatus) { await setStatus(id, s); }
  async function handleFeedback(correct: boolean) {
    await submitRoutingFeedback(id, {
      correct,
      submittedAt: new Date().toISOString(),
      submittedBy: displayName,
    });
    setFeedbackSubmitted(true);
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FAF8F5" }}>
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-semibold text-stone-900 tracking-tight">CampusReach</span>
              <span className="ml-2 text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full font-medium">Staff view</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-stone-400">
              <User className="w-3.5 h-3.5 text-stone-300" />
              <span>Signed in as <span className="text-stone-600 font-medium">{displayName}</span> — <span className="text-stone-500">{displayDept}</span></span>
            </div>
            <Button variant="ghost" size="sm" onClick={logoutStaff}><LogOut className="w-3.5 h-3.5" />Sign out</Button>
            <Button variant="ghost" size="sm" onClick={goToQueue}><List className="w-3.5 h-3.5" />Queue</Button>
            <Button variant="ghost" size="sm" onClick={resetToIntake}><RotateCcw className="w-3.5 h-3.5" />New intake</Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8 space-y-5">
        {/* Case header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-stone-400 mb-1">Incoming case</p>
            <h1 className="text-2xl font-bold text-stone-900">Case #{id.slice(-8).toUpperCase()}</h1>
            <p className="text-xs text-stone-400 mt-1">Submitted {formatTime(createdAt)} · Status: <strong className="text-stone-600">{STATUS_LABEL[status]}</strong></p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span className="text-stone-400">{formatTime(createdAt)}</span>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${
              slaOverdue ? "bg-red-50 text-red-600 border border-red-200" : "bg-stone-100 text-stone-600"
            }`}>
              {slaOverdue && <AlertTriangle className="w-3 h-3" />}
              SLA: {slaLabel}
            </span>
          </div>
        </div>

        {/* Actions strip */}
        <div className="flex flex-wrap gap-2">
          {status === "submitted" || status === "triaged" ? (
            <Button size="sm" onClick={handleAccept}>
              <UserCheck className="w-3.5 h-3.5" />
              {assignedTo === displayName ? "Already assigned to me" : "Accept / Assign to me"}
            </Button>
          ) : null}
          {isCrisis && !acknowledgedAt && (
            <Button size="sm" variant="crisis" onClick={handleAcknowledge}>
              Acknowledge crisis
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => setShowReassign((x) => !x)}>
            Reassign
          </Button>
          {(["triaged","assigned","appointment_offered"] as CaseStatus[]).map((s) => (
            status !== s ? (
              <Button key={s} size="sm" variant="secondary" onClick={() => handleStatus(s)}>
                → {STATUS_LABEL[s]}
              </Button>
            ) : null
          ))}
          {status !== "resolved" && (
            <Button size="sm" variant="secondary" onClick={() => handleStatus("resolved")}>
              Mark resolved
            </Button>
          )}
        </div>

        {/* Reassign panel */}
        {showReassign && (
          <Card>
            <CardContent className="pt-4 pb-4 space-y-3">
              <p className="text-sm font-medium text-stone-800">Reassign to department</p>
              <select
                value={reassignDept}
                onChange={(e) => setReassignDept(e.target.value)}
                className="w-full h-11 rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Select department…</option>
                {Object.values(DEPARTMENTS).map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <input
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value)}
                placeholder="Reason for reassignment (required)"
                className="w-full h-11 rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleReassign} disabled={!reassignDept || !reassignReason.trim()}>Confirm reassign</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowReassign(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          {/* LEFT */}
          <div className="space-y-5">
            <Card className={`border-l-4 ${URGENCY_BORDER[urgencyLevel]}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Triage summary</CardTitle>
                  <Badge variant={URGENCY_BADGE[urgencyLevel]}>
                    {urgencyLevel.charAt(0).toUpperCase() + urgencyLevel.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex items-center gap-2 text-sm"><Building2 className="w-4 h-4 text-stone-400 shrink-0" /><span className="text-stone-800">Routed to: <strong>{department.name}</strong></span></div>
                {secondaryCategory && <div className="flex items-center gap-2 text-sm"><Info className="w-4 h-4 text-stone-400 shrink-0" /><span className="text-stone-600">Also: {formatCategory(secondaryCategory)}</span></div>}
                <div className="flex items-center gap-2 text-sm"><User className="w-4 h-4 text-stone-400 shrink-0" /><span className="text-stone-800">Category: <strong>{formatCategory(category)}</strong></span></div>
                <div className="flex items-center gap-2 text-sm"><Clock className="w-4 h-4 text-stone-400 shrink-0" /><span className="text-stone-800">Score: <strong>{score}</strong></span></div>
                {assignedTo && <div className="flex items-center gap-2 text-sm"><UserCheck className="w-4 h-4 text-teal-500 shrink-0" /><span className="text-stone-800">Assigned: <strong>{assignedTo}</strong></span></div>}
              </CardContent>
            </Card>

            {/* Routing reasoning */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="w-4 h-4 text-teal-600" />
                  Routing reasoning
                  <span className="text-xs font-normal text-stone-400">
                    · {source === "rules" ? "Rule-based" : source === "ai" || source === "ai_cached" ? `AI · ${aiConfidence ? Math.round(aiConfidence * 100) : "?"}%` : "Human triage"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <p className="text-sm text-stone-600 leading-relaxed">{explanation}</p>
                {(evidencePhrases.length > 0 ? evidencePhrases : matchedKeywords.map((k) => k.word)).length > 0 && (
                  <div>
                    <p className="text-xs text-stone-400 mb-2">Matched signals:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(evidencePhrases.length > 0 ? evidencePhrases : matchedKeywords.map((k) => k.word)).map((w) => (
                        <span key={w} className="text-xs px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full border border-teal-100">{w}</span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Routing feedback */}
                {!routingFeedback && !feedbackSubmitted && (
                  <div className="pt-1">
                    <p className="text-xs text-stone-400 mb-2">Was this routing correct?</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => handleFeedback(true)}>
                        <ThumbsUp className="w-3.5 h-3.5" /> Yes
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => handleFeedback(false)}>
                        <ThumbsDown className="w-3.5 h-3.5" /> No
                      </Button>
                    </div>
                  </div>
                )}
                {(routingFeedback || feedbackSubmitted) && (
                  <p className="text-xs text-teal-600">✓ Routing feedback recorded</p>
                )}
              </CardContent>
            </Card>

            {/* Workflow trace */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Workflow trace</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {events.length === 0 && <p className="text-xs text-stone-400">No events yet.</p>}
                  {events.map((ev) => (
                    <div key={ev.id} className="flex items-start gap-2 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0 mt-1.5" />
                      <div>
                        <span className="font-medium text-stone-700 capitalize">{ev.type.replace(/_/g, " ")}</span>
                        {ev.detail && <span className="text-stone-400"> — {ev.detail}</span>}
                        <span className="text-stone-300 ml-1">· {ev.actor} · {formatTime(ev.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT */}
          <div className="space-y-5">
            {/* Crisis banner */}
            {isCrisis && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-900 leading-relaxed">
                    <strong>Consent review was skipped for this case.</strong>{" "}
                    Crisis-level messages go to the response team in full, immediately — the same principle counselors use when safety concerns override standard confidentiality.
                  </p>
                  {acknowledgedAt && (
                    <p className="text-xs text-amber-700 mt-1.5">✓ Acknowledged at {formatTime(acknowledgedAt)}</p>
                  )}
                </div>
              </div>
            )}

            {/* Student message */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Student's message</CardTitle>
                {restrictedCount > 0 && (
                  <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                    <EyeOff className="w-3 h-3" />
                    {restrictedCount} part{restrictedCount > 1 ? "s" : ""} restricted
                  </p>
                )}
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {includedSegments.map((seg) => (
                  <div key={seg.id}>
                    {seg.isSensitive && (
                      <span className="text-[10px] text-amber-600 flex items-center gap-1 mb-0.5">
                        <Shield className="w-2.5 h-2.5" />Sensitive content
                      </span>
                    )}
                    <p className="text-sm text-stone-800 leading-relaxed bg-stone-50 rounded-lg px-3 py-2">{seg.text}</p>
                  </div>
                ))}
                {restrictedCount > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <EyeOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <p className="text-xs text-amber-700">{restrictedCount} section{restrictedCount > 1 ? "s" : ""} withheld at student's request.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {intakeData.contextText && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Additional context</CardTitle></CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-stone-600 bg-stone-50 rounded-lg px-3 py-2">{intakeData.contextText}</p>
                </CardContent>
              </Card>
            )}

            {/* Appointment offering */}
            {status !== "resolved" && status !== "withdrawn" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-teal-600" />
                    Offer appointment
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {offeredAppointment ? (
                    <div className="text-sm text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
                      ✓ Offered: <strong>{offeredAppointment.label}</strong>
                    </div>
                  ) : (
                    (currentCase.appointmentSlots ?? []).map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => handleOffer(slot)}
                        className="w-full text-left text-sm px-3 py-2 rounded-lg border border-stone-200 hover:border-teal-400 hover:bg-teal-50 transition-colors"
                      >
                        {slot.label}
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>
            )}

            {/* Internal notes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquarePlus className="w-4 h-4 text-teal-600" />
                  Internal notes
                  <span className="text-xs font-normal text-stone-400">Not visible to student</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {notes.length === 0 ? (
                  <p className="text-xs text-stone-400">No notes yet.</p>
                ) : (
                  notes.map((n) => (
                    <div key={n.id} className="text-sm bg-stone-50 rounded-lg px-3 py-2">
                      <p className="text-stone-800">{n.text}</p>
                      <p className="text-xs text-stone-400 mt-1">{n.authorName} · {formatTime(n.createdAt)}</p>
                    </div>
                  ))
                )}
                <div className="flex gap-2">
                  <input
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a note…"
                    className="flex-1 h-9 rounded-lg border border-stone-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    onKeyDown={(e) => { if (e.key === "Enter") handleNote(); }}
                  />
                  <Button size="sm" onClick={handleNote} disabled={!noteText.trim()}>Add</Button>
                </div>
              </CardContent>
            </Card>

            {/* No-repeat callout */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-teal-50 border border-teal-200">
              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <p className="text-sm text-teal-800 leading-relaxed">
                <strong>The student will not need to repeat this story.</strong>{" "}
                Everything above has been pre-briefed.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <div className="flex items-center justify-center gap-3">
            <Button variant="ghost" size="sm" onClick={goToQueue}>← Back to queue</Button>
            <Button variant="outline" onClick={resetToIntake}>New intake</Button>
          </div>
          <p className="mt-3 text-xs text-stone-400">Demo mode · Data stored locally</p>
        </div>
      </main>
    </div>
  );
}
