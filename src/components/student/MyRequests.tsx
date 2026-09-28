import { useEffect, useState } from "react";
import {
  ArrowRight, Calendar, CheckCircle2, Clock, LogOut,
  RefreshCw, RotateCcw, Shield, Undo2, XCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/lib/AppContext";
import type { CaseRecord, CaseStatus, UrgencyLevel } from "@/types";
import { getCasesByStudent } from "@/lib/store";

const URGENCY_BADGE: Record<UrgencyLevel, "low" | "medium" | "high" | "crisis"> = {
  low: "low", medium: "medium", high: "high", crisis: "crisis",
};

const STATUS_STEPS: CaseStatus[] = [
  "submitted", "triaged", "assigned", "appointment_offered", "resolved",
];

const STATUS_LABEL: Record<CaseStatus, string> = {
  submitted: "Submitted",
  triaged: "Triaged",
  assigned: "Assigned",
  appointment_offered: "Appointment offered",
  resolved: "Resolved",
  withdrawn: "Withdrawn",
};

function formatRelTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatCategory(cat: string): string {
  return cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function TrackerTimeline({ status }: { status: CaseStatus }) {
  if (status === "withdrawn") {
    return (
      <div className="flex items-center gap-2 text-sm text-stone-400">
        <XCircle className="w-4 h-4 text-stone-300" />
        <span>This request was withdrawn.</span>
      </div>
    );
  }
  const activeIdx = STATUS_STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {STATUS_STEPS.map((step, i) => {
        const done = i < activeIdx;
        const active = i === activeIdx;
        return (
          <div key={step} className="flex items-center gap-1">
            {i > 0 && <div className={`h-px w-4 ${done || active ? "bg-teal-400" : "bg-stone-200"}`} />}
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
              active ? "bg-teal-600 text-white" :
              done ? "bg-teal-50 text-teal-700 border border-teal-200" :
              "bg-stone-100 text-stone-400"
            }`}>
              {done && <CheckCircle2 className="w-3 h-3" />}
              {STATUS_LABEL[step]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MyRequests() {
  const { session, revokeCase, resetToIntake, logout } = useApp();
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  async function loadCases() {
    if (!session?.studentId) return;
    setLoading(true);
    const c = await getCasesByStudent(session.studentId);
    setCases(c.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setLoading(false);
  }

  useEffect(() => { loadCases(); }, [session?.studentId]);

  async function handleRevoke(caseId: string) {
    setRevoking(caseId);
    await revokeCase(caseId);
    await loadCases();
    setRevoking(null);
  }

  const canRevoke = (c: CaseRecord) =>
    c.status === "submitted" || c.status === "triaged";

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FAF8F5" }}>
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-stone-900 tracking-tight">CampusReach</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-stone-500 hidden sm:block">
              {session?.name}
            </span>
            <Button variant="ghost" size="sm" onClick={resetToIntake}>
              <RotateCcw className="w-3.5 h-3.5" />
              New request
            </Button>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-400 mb-1">Signed in as {session?.name}</p>
            <h1 className="text-2xl font-bold text-stone-900">My Requests</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={loadCases}>
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-stone-400 text-sm">Loading your requests…</div>
        ) : cases.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-stone-400 text-sm mb-4">No requests yet.</p>
            <Button onClick={resetToIntake}>Submit a new request <ArrowRight className="w-4 h-4" /></Button>
          </div>
        ) : (
          <div className="space-y-4">
            {cases.map((c) => (
              <CaseCard
                key={c.id}
                caseRecord={c}
                canRevoke={canRevoke(c)}
                revoking={revoking === c.id}
                onRevoke={() => handleRevoke(c.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function CaseCard({
  caseRecord: c,
  canRevoke,
  revoking,
  onRevoke,
}: {
  caseRecord: CaseRecord;
  canRevoke: boolean;
  revoking: boolean;
  onRevoke: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isWithdrawn = c.status === "withdrawn";
  const viewedEvents = c.events.filter((e) => e.type === "viewed");

  return (
    <Card className={isWithdrawn ? "opacity-60" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-base">
                Case #{c.id.slice(-4).toUpperCase()}
              </CardTitle>
              <Badge variant={URGENCY_BADGE[c.routingResult.urgencyLevel]}>
                {c.routingResult.urgencyLevel}
              </Badge>
              {c.routingResult.needsHumanTriage && (
                <Badge variant="outline">Human review</Badge>
              )}
            </div>
            <p className="text-xs text-stone-500">
              {formatCategory(c.routingResult.category)} · {c.routingResult.department.shortName} · {formatRelTime(c.createdAt)}
            </p>
          </div>
          {canRevoke && !isWithdrawn && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRevoke}
              disabled={revoking}
              className="text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
            >
              <Undo2 className="w-3.5 h-3.5" />
              {revoking ? "Withdrawing…" : "Withdraw"}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Timeline */}
        <TrackerTimeline status={c.status} />

        {/* Appointment offered */}
        {c.offeredAppointment && (
          <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-teal-50 border border-teal-200">
            <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="text-teal-800">
              Appointment offered: <strong>{c.offeredAppointment.label}</strong>
            </span>
          </div>
        )}

        {/* Wait estimate from routing */}
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <Clock className="w-3.5 h-3.5" />
          Typical wait: <strong className="text-stone-700">{c.routingResult.department.typicalWait}</strong>
        </div>

        {/* Who viewed this */}
        {viewedEvents.length > 0 && (
          <div className="text-xs text-stone-400">
            Viewed by staff: {viewedEvents.map((e) => `${e.actor} (${formatRelTime(e.timestamp)})`).join(", ")}
          </div>
        )}

        {/* Routing reason */}
        <button
          onClick={() => setExpanded((x) => !x)}
          className="text-xs text-teal-600 hover:text-teal-800 transition-colors"
        >
          {expanded ? "Hide" : "Show"} routing reason
        </button>
        {expanded && (
          <p className="text-xs text-stone-500 leading-relaxed bg-stone-50 rounded-lg px-3 py-2">
            {c.routingResult.explanation}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
