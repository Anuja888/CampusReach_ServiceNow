import { ArrowRight, Clock, Inbox, LogOut, RotateCcw, Shield, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/AppContext";
import { getSortedMockCases } from "@/lib/mockCases";
import type { CaseRecord, UrgencyLevel } from "@/types";

const URGENCY_BADGE: Record<UrgencyLevel, "low" | "medium" | "high" | "crisis"> = {
  low: "low",
  medium: "medium",
  high: "high",
  crisis: "crisis",
};

function formatCategory(cat: string): string {
  return cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatRelativeTime(iso: string): string {
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return "";
  }
}

export function StaffQueue() {
  const { goToStaff, resetToIntake, logoutStaff, staffSession } = useApp();

  const cases = getSortedMockCases();

  // Fall back to the hardcoded default so the label is never blank
  const displayName = staffSession?.name ?? "Dr. Sarah Okafor";
  const displayDept = staffSession?.department ?? "Student Wellbeing Service";

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FAF8F5" }}>

      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">

          {/* Logo + badge */}
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

          {/* Right: identity + sign out + new intake */}
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
            <p className="text-xs text-stone-400 mb-1 uppercase tracking-wider">Incoming</p>
            <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
              <Inbox className="w-6 h-6 text-teal-600" />
              Case Queue
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Sorted by urgency</span>
          </div>
        </div>

        <div className="space-y-2">
          {cases.map((c) => (
            <CaseRow key={c.id} caseRecord={c} onClick={() => goToStaff(c)} />
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-stone-400">
            Demo mode · {cases.length} cases · Sorted by urgency · Click any row to open
          </p>
        </div>

      </main>
    </div>
  );
}

// ─── Case row ─────────────────────────────────────────────────────────────────

function CaseRow({
  caseRecord,
  onClick,
}: {
  caseRecord: CaseRecord;
  onClick: () => void;
}) {
  const { routingResult, createdAt, id } = caseRecord;
  const { urgencyLevel, category, department } = routingResult;
  const isCrisis = urgencyLevel === "crisis";

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left rounded-xl border px-5 py-4
        flex items-center gap-4
        transition-all duration-150 group
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2
        ${
          isCrisis
            ? "bg-amber-50 border-amber-300 hover:bg-amber-100 hover:border-amber-400"
            : "bg-white border-stone-200 hover:border-teal-300 hover:bg-teal-50/30"
        }
      `}
    >
      {/* Urgency accent bar */}
      <div
        className={`w-1 self-stretch rounded-full shrink-0 ${
          urgencyLevel === "crisis"
            ? "bg-amber-500"
            : urgencyLevel === "high"
            ? "bg-red-400"
            : urgencyLevel === "medium"
            ? "bg-amber-400"
            : "bg-emerald-400"
        }`}
      />

      {/* Case info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-sm font-semibold ${
              isCrisis ? "text-amber-900" : "text-stone-900"
            }`}
          >
            Case #{id.slice(-3).toUpperCase()}
          </span>
          <Badge variant={URGENCY_BADGE[urgencyLevel]}>
            {urgencyLevel.charAt(0).toUpperCase() + urgencyLevel.slice(1)}
          </Badge>
          {isCrisis && (
            <span className="text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-300 rounded-full px-2 py-0.5 animate-pulse-soft">
              Immediate
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-500">
          <span>{formatCategory(category)}</span>
          <span className="text-stone-300">·</span>
          <span>{department.shortName}</span>
          <span className="text-stone-300">·</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(createdAt)}
          </span>
        </div>
      </div>

      {/* Preview text */}
      <p
        className={`hidden md:block text-xs max-w-[220px] truncate ${
          isCrisis ? "text-amber-700" : "text-stone-400"
        }`}
      >
        {caseRecord.intakeData.mainText.slice(0, 80)}…
      </p>

      {/* Arrow */}
      <ArrowRight
        className={`w-4 h-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 ${
          isCrisis ? "text-amber-500" : "text-stone-300 group-hover:text-teal-500"
        }`}
      />
    </button>
  );
}
