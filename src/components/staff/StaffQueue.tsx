import { useEffect, useState } from "react";
import {
  AlertTriangle, ArrowRight, Clock, Inbox, LogOut,
  RotateCcw, Search, Shield, User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/AppContext";
import { getSortedMockCases } from "@/lib/mockCases";
import { listCases } from "@/lib/store";
import type { CaseRecord, UrgencyLevel } from "@/types";

const URGENCY_BADGE: Record<UrgencyLevel, "low" | "medium" | "high" | "crisis"> = {
  low: "low", medium: "medium", high: "high", crisis: "crisis",
};

// SLA in minutes per urgency
const SLA: Record<UrgencyLevel, number> = {
  crisis: 5, high: 240, medium: 1440, low: 4320,
};

type FilterKey = "all" | "crisis" | "high" | "human" | "mine";

function formatCategory(cat: string): string {
  return cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatRelTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function slaStatus(createdAt: string, urgencyLevel: UrgencyLevel): { pct: number; overdue: boolean; label: string } {
  const elapsed = (Date.now() - new Date(createdAt).getTime()) / 60000; // minutes
  const limit = SLA[urgencyLevel];
  const remaining = Math.max(0, limit - elapsed);
  const pct = Math.min(100, (elapsed / limit) * 100);
  const overdue = elapsed > limit;
  let label: string;
  if (overdue) {
    label = `Overdue ${Math.floor(elapsed - limit)}m`;
  } else if (remaining < 60) {
    label = `${Math.round(remaining)}m left`;
  } else {
    label = `${Math.round(remaining / 60)}h left`;
  }
  return { pct, overdue, label };
}

export function StaffQueue() {
  const { goToStaff, resetToIntake, logoutStaff, staffSession, session } = useApp();
  const [allCases, setAllCases] = useState<CaseRecord[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  const displayName = staffSession?.name ?? session?.name ?? "Dr. Sarah Okafor";
  const displayDept = staffSession?.department ?? session?.department ?? "Student Wellbeing Service";

  useEffect(() => {
    async function load() {
      const live = await listCases();
      const mock = getSortedMockCases();
      // Merge: live cases first, then mock cases not already in live
      const liveIds = new Set(live.map((c) => c.id));
      const merged = [
        ...live,
        ...mock.filter((c) => !liveIds.has(c.id)),
      ].sort((a, b) => {
        const uo: Record<UrgencyLevel, number> = { crisis: 0, high: 1, medium: 2, low: 3 };
        return uo[a.routingResult.urgencyLevel] - uo[b.routingResult.urgencyLevel];
      });
      setAllCases(merged.filter((c) => c.status !== "withdrawn"));
    }
    load();
  }, []);

  const filtered = allCases.filter((c) => {
    if (filter === "crisis") return c.routingResult.urgencyLevel === "crisis";
    if (filter === "high") return c.routingResult.urgencyLevel === "high";
    if (filter === "human") return c.routingResult.needsHumanTriage;
    if (filter === "mine") return c.assignedTo === displayName;
    return true;
  }).filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.id.includes(s) ||
      c.routingResult.category.includes(s) ||
      c.routingResult.department.shortName.toLowerCase().includes(s) ||
      c.intakeData.mainText.toLowerCase().includes(s)
    );
  });

  // Summary strip
  const openCount = allCases.length;
  const urgentCount = allCases.filter((c) => c.routingResult.urgencyLevel === "crisis" || c.routingResult.urgencyLevel === "high").length;
  const humanCount = allCases.filter((c) => c.routingResult.needsHumanTriage).length;

  const FILTERS: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "All", count: allCases.length },
    { key: "crisis", label: "Crisis", count: allCases.filter((c) => c.routingResult.urgencyLevel === "crisis").length },
    { key: "high", label: "High", count: allCases.filter((c) => c.routingResult.urgencyLevel === "high").length },
    { key: "human", label: "Needs triage", count: humanCount },
    { key: "mine", label: "Assigned to me", count: allCases.filter((c) => c.assignedTo === displayName).length },
  ];

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
            <Button variant="ghost" size="sm" onClick={resetToIntake}>
              <RotateCcw className="w-3.5 h-3.5" />
              New intake
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
        {/* Title + summary */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-400 mb-1 uppercase tracking-wider">Incoming</p>
            <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
              <Inbox className="w-6 h-6 text-teal-600" />
              Case Queue
            </h1>
          </div>
          <div className="flex items-center gap-4 text-xs text-stone-400">
            <span><strong className="text-stone-700">{openCount}</strong> open</span>
            <span><strong className="text-red-600">{urgentCount}</strong> urgent</span>
            <span><strong className="text-amber-600">{humanCount}</strong> need triage</span>
          </div>
        </div>

        {/* Search + filters */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <Input
              placeholder="Search cases…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  filter === f.key
                    ? "bg-teal-600 text-white border-teal-600"
                    : "bg-white text-stone-600 border-stone-200 hover:border-teal-400 hover:text-teal-700"
                }`}
              >
                {f.label} {f.count > 0 && <span className="ml-1 opacity-70">{f.count}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Case list */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <p className="text-center py-12 text-stone-400 text-sm">No cases match this filter.</p>
          ) : (
            filtered.map((c) => (
              <CaseRow key={c.id} caseRecord={c} onClick={() => goToStaff(c)} staffName={displayName} />
            ))
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-stone-400">
            Demo mode · {filtered.length} shown · Sorted by urgency
          </p>
        </div>
      </main>
    </div>
  );
}

function CaseRow({ caseRecord: c, onClick, staffName }: { caseRecord: CaseRecord; onClick: () => void; staffName: string }) {
  const { urgencyLevel, category, department, needsHumanTriage } = c.routingResult;
  const isCrisis = urgencyLevel === "crisis";
  const sla = slaStatus(c.createdAt, urgencyLevel);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border px-4 py-3.5 flex items-center gap-4 transition-all duration-150 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 ${
        isCrisis
          ? "bg-amber-50 border-amber-300 hover:bg-amber-100 hover:border-amber-400"
          : "bg-white border-stone-200 hover:border-teal-300 hover:bg-teal-50/30"
      }`}
    >
      {/* Accent bar */}
      <div className={`w-1 self-stretch rounded-full shrink-0 ${
        urgencyLevel === "crisis" ? "bg-amber-500" :
        urgencyLevel === "high" ? "bg-red-400" :
        urgencyLevel === "medium" ? "bg-amber-400" : "bg-emerald-400"
      }`} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-sm font-semibold ${isCrisis ? "text-amber-900" : "text-stone-900"}`}>
            Case #{c.id.slice(-3).toUpperCase()}
          </span>
          <Badge variant={URGENCY_BADGE[urgencyLevel]}>
            {urgencyLevel.charAt(0).toUpperCase() + urgencyLevel.slice(1)}
          </Badge>
          {isCrisis && (
            <span className="text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-300 rounded-full px-2 py-0.5 animate-pulse-soft">
              Immediate
            </span>
          )}
          {needsHumanTriage && (
            <Badge variant="outline">Human triage</Badge>
          )}
          {c.assignedTo === staffName && (
            <span className="text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5">Mine</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-500 flex-wrap">
          <span>{formatCategory(category)}</span>
          <span className="text-stone-300">·</span>
          <span>{department.shortName}</span>
          <span className="text-stone-300">·</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelTime(c.createdAt)}
          </span>
          {/* SLA indicator */}
          <span className={`flex items-center gap-1 ${sla.overdue ? "text-red-600 font-semibold" : sla.pct > 75 ? "text-amber-600" : "text-stone-400"}`}>
            {sla.overdue && <AlertTriangle className="w-3 h-3" />}
            SLA: {sla.label}
          </span>
        </div>
      </div>

      {/* Preview */}
      <p className={`hidden md:block text-xs max-w-[200px] truncate ${isCrisis ? "text-amber-700" : "text-stone-400"}`}>
        {c.intakeData.mainText.slice(0, 70)}…
      </p>

      <ArrowRight className={`w-4 h-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 ${isCrisis ? "text-amber-500" : "text-stone-300 group-hover:text-teal-500"}`} />
    </button>
  );
}
