import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Info,
  Mail,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useApp } from "@/lib/AppContext";
import type { UrgencyLevel } from "@/types";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as number[] },
  },
};

const URGENCY_BADGE: Record<UrgencyLevel, "low" | "medium" | "high" | "crisis"> = {
  low: "low",
  medium: "medium",
  high: "high",
  crisis: "crisis",
};

const URGENCY_DOT: Record<UrgencyLevel, string> = {
  low: "bg-emerald-500",
  medium: "bg-amber-500",
  high: "bg-red-500",
  crisis: "bg-amber-600",
};

function formatCategory(cat: string): string {
  return cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ResultScreen() {
  const { currentCase, resetToIntake, goToHandoff } = useApp();

  if (!currentCase) return null;

  const { routingResult } = currentCase;
  const { department, urgencyLevel, explanation, matchedKeywords, category } = routingResult;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FAF8F5" }}>
      {/* Header */}
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-semibold text-stone-900 tracking-tight">CampusReach</span>
          <button
            onClick={resetToIntake}
            className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Start over
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full px-6 py-12">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

          {/* Success marker */}
          <motion.div variants={item} className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-teal-600" />
            <span className="text-sm font-medium text-teal-700">Support found</span>
          </motion.div>

          {/* Department hero */}
          <motion.div variants={item}>
            <p className="text-sm text-stone-500 mb-1">You've been routed to</p>
            <h1 className="text-3xl font-bold text-stone-900 leading-tight mb-3">
              {department.name}
            </h1>
            <p className="text-stone-600 leading-relaxed">{department.description}</p>
          </motion.div>

          {/* Badges */}
          <motion.div variants={item} className="flex flex-wrap gap-2">
            <Badge variant={URGENCY_BADGE[urgencyLevel]}>
              <span className={`w-1.5 h-1.5 rounded-full ${URGENCY_DOT[urgencyLevel]}`} />
              {urgencyLevel.charAt(0).toUpperCase() + urgencyLevel.slice(1)} priority
            </Badge>
            <Badge variant="secondary">{formatCategory(category)}</Badge>
          </motion.div>

          {/* Why this route */}
          <motion.div variants={item}>
            <Card>
              <CardContent className="pt-5">
                <div className="flex gap-3">
                  <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-teal-700 uppercase tracking-wider mb-1">
                      Why this route
                      <span className="ml-2 font-normal normal-case text-stone-400">
                        · Rule-based scoring — no black box
                      </span>
                    </p>
                    <p className="text-sm text-stone-600 leading-relaxed">{explanation}</p>
                    {matchedKeywords.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {matchedKeywords.slice(0, 6).map((kw) => (
                          <span
                            key={kw.word}
                            className="text-xs px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full border border-teal-100"
                          >
                            {kw.word}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contact + wait */}
          <motion.div variants={item}>
            <Card>
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-stone-400 shrink-0" />
                  <span className="text-stone-800">{department.contact}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="w-4 h-4 text-stone-400 shrink-0" />
                  <span className="text-stone-800">
                    Typical wait: <strong>{department.typicalWait}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="w-4 h-4 text-stone-400 shrink-0" />
                  <span className="text-stone-500">
                    Your case will be pre-briefed — you won't need to repeat your story.
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* CTAs */}
          <motion.div variants={item} className="flex flex-col gap-3 pt-2">
            <Button size="lg" className="w-full" onClick={goToHandoff}>
              Review & send to {department.shortName}
              <ArrowRight className="w-4 h-4" />
            </Button>
            <button
              onClick={resetToIntake}
              className="text-sm text-stone-400 hover:text-stone-700 transition-colors text-center"
            >
              Not right? Start over and we'll try again.
            </button>
          </motion.div>

        </motion.div>
      </main>
    </div>
  );
}
