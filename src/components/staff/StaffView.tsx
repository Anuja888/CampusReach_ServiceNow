import {
  Building2,
  CheckCircle2,
  Clock,
  EyeOff,
  Info,
  List,
  LogOut,
  RotateCcw,
  Shield,
  ShieldAlert,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/lib/AppContext";
import type { UrgencyLevel } from "@/types";

const URGENCY_BORDER: Record<UrgencyLevel, string> = {
  low:    "border-l-emerald-400",
  medium: "border-l-amber-400",
  high:   "border-l-red-500",
  crisis: "border-l-amber-600",
};

const URGENCY_BADGE: Record<UrgencyLevel, "low" | "medium" | "high" | "crisis"> = {
  low: "low",
  medium: "medium",
  high: "high",
  crisis: "crisis",
};

function formatCategory(cat: string): string {
  return cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function StaffView() {
  const {
    currentCase,
    resetToIntake,
    goToQueue,
    logoutStaff,
    staffSession,
  } = useApp();

  if (!currentCase) return null;

  const { routingResult, scoringResult, segments, intakeData, createdAt, id } =
    currentCase;
  const { department, urgencyLevel, explanation, matchedKeywords, category, score } =
    routingResult;

  const isCrisis = scoringResult.isCrisis;
  const includedSegments = segments.filter((s) => s.included);
  const restrictedCount  = segments.filter((s) => !s.included).length;

  // Fall back to hardcoded default so the label is never blank
  const displayName = staffSession?.name ?? "Dr. Sarah Okafor";
  const displayDept = staffSession?.department ?? "Student Wellbeing Service";

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FAF8F5" }}>

      {/* Header — identical structure to StaffQueue */}
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-semibold text-stone-900 tracking-tight">CampusReach</span>
              <span className="ml-2 text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full font-medium">
                Staff view
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-stone-400">
              <User className="w-3.5 h-3.5 text-stone-300" />
              <span>
                Signed in as{" "}
                <span className="text-stone-600 font-medium">{displayName}</span>
                {" — "}
                <span className="text-stone-500">{displayDept}</span>
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={logoutStaff}>
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </Button>
            <Button variant="ghost" size="sm" onClick={goToQueue}>
              <List className="w-3.5 h-3.5" />
              Queue
            </Button>
            <Button variant="ghost" size="sm" onClick={resetToIntake}>
              <RotateCcw className="w-3.5 h-3.5" />
              New intake
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10">

        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-400 mb-1">Incoming case</p>
            <h1 className="text-2xl font-bold text-stone-900">
              Case #{id.slice(-8).toUpperCase()}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
            <span>Submitted {formatTime(createdAt)}</span>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">

          {/* LEFT — triage summary + routing reasoning */}
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
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-stone-400 shrink-0" />
                  <span className="text-stone-800">
                    Routed to: <strong>{department.name}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-stone-400 shrink-0" />
                  <span className="text-stone-800">
                    Category: <strong>{formatCategory(category)}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-stone-400 shrink-0" />
                  <span className="text-stone-800">
                    Urgency score: <strong>{score}</strong>/20
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="w-4 h-4 text-teal-600" />
                  Routing reasoning
                  <span className="text-xs font-normal text-stone-400">
                    · Rule-based — no black box
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <p className="text-sm text-stone-600 leading-relaxed">{explanation}</p>
                {matchedKeywords.length > 0 && (
                  <div>
                    <p className="text-xs text-stone-400 mb-2">Matched signals:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {matchedKeywords.map((kw) => (
                        <span
                          key={kw.word}
                          className="text-xs px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full border border-teal-100"
                          title={`Weight: ${kw.weight} · Category: ${kw.category}`}
                        >
                          {kw.word}
                          <span className="ml-1 text-teal-400">×{kw.weight}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* RIGHT — student message + context */}
          <div className="space-y-5">

            {/* ── Crisis consent-bypass banner ─────────────────────────────
                Rendered ONLY for crisis cases, above the message card.
                Uses the amber tokens already established for crisis state.  */}
            {isCrisis && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-900 leading-relaxed">
                  <strong>Consent review was skipped for this case.</strong>{" "}
                  Crisis-level messages go to the response team in full,
                  immediately — the same principle counselors use when safety
                  concerns override standard confidentiality.
                </p>
              </div>
            )}

            {/* Student message card — unchanged */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Student's message</CardTitle>
                {restrictedCount > 0 && (
                  <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                    <EyeOff className="w-3 h-3" />
                    {restrictedCount} part{restrictedCount > 1 ? "s" : ""} restricted by student
                  </p>
                )}
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {includedSegments.map((seg) => (
                  <div key={seg.id}>
                    {seg.isSensitive && (
                      <span className="text-[10px] text-amber-600 flex items-center gap-1 mb-0.5">
                        <Shield className="w-2.5 h-2.5" />
                        Sensitive content
                      </span>
                    )}
                    <p className="text-sm text-stone-800 leading-relaxed bg-stone-50 rounded-lg px-3 py-2">
                      {seg.text}
                    </p>
                  </div>
                ))}
                {restrictedCount > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <EyeOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <p className="text-xs text-amber-700">
                      {restrictedCount} section{restrictedCount > 1 ? "s" : ""} withheld
                      at the student's request. Content not stored or transmitted.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {intakeData.contextText && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Additional context</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-stone-600 bg-stone-50 rounded-lg px-3 py-2">
                    {intakeData.contextText}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* No-repeat callout — unchanged */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-teal-50 border border-teal-200">
              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <p className="text-sm text-teal-800 leading-relaxed">
                <strong>The student will not need to repeat this story.</strong>{" "}
                Everything above has been pre-briefed — open the case directly without
                asking them to start from scratch.
              </p>
            </div>

          </div>
        </div>

        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-3">
            <Button variant="ghost" size="sm" onClick={goToQueue}>
              ← Back to queue
            </Button>
            <Button variant="outline" onClick={resetToIntake}>
              New intake
            </Button>
          </div>
          <p className="mt-3 text-xs text-stone-400">
            Demo mode · Data stored locally · No real data transmitted
          </p>
        </div>

      </main>
    </div>
  );
}
