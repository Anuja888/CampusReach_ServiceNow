import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import { BookOpen, CheckCircle2, List, LogOut, PlusCircle, RotateCcw, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/lib/AppContext";
import { getSortedMockCases, MOCK_CASES } from "@/lib/mockCases";
import { listCases } from "@/lib/store";
import type { CaseRecord } from "@/types";

// Dictionary override: phrases staff can add to the rules dictionary
const DICT_OVERRIDE_KEY = "campusreach_dict_overrides";

interface DictOverride {
  phrase: string;
  suggestedCategory: string;
  addedAt: string;
  addedBy: string;
}

function loadOverrides(): DictOverride[] {
  try { return JSON.parse(localStorage.getItem(DICT_OVERRIDE_KEY) ?? "[]"); }
  catch { return []; }
}
function saveOverrides(overrides: DictOverride[]) {
  try { localStorage.setItem(DICT_OVERRIDE_KEY, JSON.stringify(overrides)); }
  catch { /* */ }
}

const TEAL_COLORS = ["#0D9488", "#0B7A72", "#5EEAD4", "#99F6E4", "#CCFBF1"];
const CAT_COLORS: Record<string, string> = {
  mental_health: "#0D9488", academic_stress: "#6366F1", financial: "#F59E0B",
  housing: "#8B5CF6", physical_health: "#10B981", social_isolation: "#F97316",
  crisis: "#EF4444", general: "#94A3B8",
};

function formatCat(cat: string): string {
  return cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function Toast({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  useEffect(() => { const t = setTimeout(onDismiss, 3000); return () => clearTimeout(t); }, []);
  return (
    <div className="fixed bottom-6 right-6 bg-teal-700 text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50">
      <CheckCircle2 className="w-4 h-4" /> {msg}
    </div>
  );
}

export function AdminInsights() {
  const { logout, goToQueue, resetToIntake, session } = useApp();
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [overrides, setOverrides] = useState<DictOverride[]>(loadOverrides());
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const live = await listCases();
      const mock = getSortedMockCases();
      const liveIds = new Set(live.map((c) => c.id));
      setCases([...live, ...mock.filter((c) => !liveIds.has(c.id))]);
    }
    load();
  }, []);

  // Category distribution
  const catMap: Record<string, number> = {};
  for (const c of cases) {
    const cat = c.routingResult.category;
    catMap[cat] = (catMap[cat] ?? 0) + 1;
  }
  const catData = Object.entries(catMap).map(([name, value]) => ({ name: formatCat(name), value, key: name }));

  // Urgency mix
  const urgMap: Record<string, number> = { low: 0, medium: 0, high: 0, crisis: 0 };
  for (const c of cases) urgMap[c.routingResult.urgencyLevel]++;
  const urgData = Object.entries(urgMap).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  const URG_COLORS = { Low: "#10B981", Medium: "#F59E0B", High: "#EF4444", Crisis: "#D97706" };

  // Source mix
  const srcMap: Record<string, number> = {};
  for (const c of cases) { const s = c.scoringResult.source; srcMap[s] = (srcMap[s] ?? 0) + 1; }
  const srcData = Object.entries(srcMap).map(([name, value]) => ({ name, value }));

  // Top signals
  const sigMap: Record<string, number> = {};
  for (const c of cases) {
    for (const kw of c.scoringResult.matchedKeywords) {
      sigMap[kw.word] = (sigMap[kw.word] ?? 0) + 1;
    }
  }
  const topSignals = Object.entries(sigMap).sort(([, a], [, b]) => b - a).slice(0, 8);

  // Routing accuracy from feedback
  const withFeedback = cases.filter((c) => c.routingFeedback);
  const correct = withFeedback.filter((c) => c.routingFeedback?.correct).length;
  const accuracyPct = withFeedback.length > 0 ? Math.round((correct / withFeedback.length) * 100) : null;

  // Dictionary gaps (cases that needed AI or human triage)
  const gaps = cases.filter((c) => c.scoringResult.source === "ai" || c.scoringResult.source === "human" || c.scoringResult.needsHumanTriage);

  function addToRules(phrase: string, suggestedCategory: string) {
    const already = overrides.some((o) => o.phrase === phrase);
    if (already) { setToast(`"${phrase}" is already in the override dictionary.`); return; }
    const updated = [...overrides, {
      phrase, suggestedCategory,
      addedAt: new Date().toISOString(),
      addedBy: session?.name ?? "admin",
    }];
    setOverrides(updated);
    saveOverrides(updated);
    setToast(`"${phrase}" added to rules dictionary. It will be matched on the next intake.`);
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FAF8F5" }}>
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-semibold text-stone-900 tracking-tight">CampusReach</span>
              <span className="ml-2 text-xs bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full font-medium">Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-stone-500 hidden sm:block">{session?.name}</span>
            <Button variant="ghost" size="sm" onClick={goToQueue}><List className="w-3.5 h-3.5" />Queue</Button>
            <Button variant="ghost" size="sm" onClick={resetToIntake}><RotateCcw className="w-3.5 h-3.5" />Intake</Button>
            <Button variant="ghost" size="sm" onClick={logout}><LogOut className="w-3.5 h-3.5" />Sign out</Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-stone-900">Insights</h1>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total cases", value: cases.length },
            { label: "Crisis", value: urgMap["crisis"] },
            { label: "Routing accuracy", value: accuracyPct !== null ? `${accuracyPct}%` : "N/A" },
            { label: "Needs triage", value: cases.filter((c) => c.scoringResult.needsHumanTriage).length },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-stone-400 mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-stone-900">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid md:grid-cols-2 gap-5">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Cases by category</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={catData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {catData.map((entry) => (
                      <Cell key={entry.key} fill={CAT_COLORS[entry.key] ?? "#94A3B8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Urgency mix</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={urgData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {urgData.map((entry) => (
                      <Cell key={entry.name} fill={URG_COLORS[entry.name as keyof typeof URG_COLORS] ?? "#94A3B8"} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Source mix + top signals */}
        <div className="grid md:grid-cols-2 gap-5">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Classification source</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {srcData.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <div className="text-xs w-20 text-stone-600 capitalize">{s.name.replace(/_/g, " ")}</div>
                    <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(s.value / cases.length) * 100}%`, backgroundColor: TEAL_COLORS[i % TEAL_COLORS.length] }} />
                    </div>
                    <span className="text-xs text-stone-500 w-6 text-right">{s.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Top matched signals</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-1.5">
                {topSignals.map(([word, count]) => (
                  <span key={word} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full border border-teal-100">
                    {word}
                    <span className="text-teal-400">×{count}</span>
                  </span>
                ))}
                {topSignals.length === 0 && <p className="text-xs text-stone-400">No signals recorded yet.</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dictionary gaps panel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-teal-600" />
              Dictionary gaps
              <span className="text-xs font-normal text-stone-400">— phrases that needed AI or human triage</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {gaps.length === 0 ? (
              <p className="text-xs text-stone-400 py-2">No gaps found — all cases matched by rules.</p>
            ) : (
              <div className="space-y-3">
                {gaps.slice(0, 8).map((c) => (
                  <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg border border-stone-200 bg-white">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-stone-600 leading-relaxed truncate">
                        "{c.intakeData.mainText.slice(0, 80)}…"
                      </p>
                      <p className="text-[10px] text-stone-400 mt-1">
                        Source: <strong>{c.scoringResult.source}</strong> · AI suggested: <strong>{formatCat(c.scoringResult.primaryCategory)}</strong>
                      </p>
                    </div>
                    {c.scoringResult.evidencePhrases.slice(0, 2).map((phrase) => (
                      <button
                        key={phrase}
                        onClick={() => addToRules(phrase, c.scoringResult.primaryCategory)}
                        className="shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-teal-200 text-teal-700 hover:bg-teal-50 transition-colors"
                        title={`Add "${phrase}" to rules`}
                      >
                        <PlusCircle className="w-3 h-3" />
                        Add "{phrase}"
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Current overrides */}
            {overrides.length > 0 && (
              <div className="mt-4 pt-4 border-t border-stone-100">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-teal-500" />
                  Dictionary overrides ({overrides.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {overrides.map((o) => (
                    <span key={o.phrase} className="text-xs px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full border border-teal-100">
                      {o.phrase} → {formatCat(o.suggestedCategory)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reset demo */}
        <div className="text-center pt-2">
          <p className="text-xs text-stone-400">
            <ResetDemoButton />
          </p>
        </div>
      </main>

      {toast && <Toast msg={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function ResetDemoButton() {
  const { resetDemo } = useApp();
  const [done, setDone] = useState(false);

  async function handleReset() {
    resetDemo(MOCK_CASES);
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  }

  return (
    <button
      onClick={handleReset}
      className="text-xs text-stone-400 hover:text-red-500 transition-colors underline underline-offset-2"
    >
      {done ? "✓ Demo data reset" : "Reset demo data"}
    </button>
  );
}
