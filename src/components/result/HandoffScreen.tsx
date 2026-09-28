import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Info, Loader2, Lock, RotateCcw, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useApp } from "@/lib/AppContext";
import type { TextSegment } from "@/types";

export function HandoffScreen() {
  const { currentCase, updateSegments, confirmHandoff, resetToIntake, isLoading } = useApp();

  // useState BEFORE any early return — Rules of Hooks
  const [segments, setSegments] = useState<TextSegment[]>(
    currentCase?.segments ?? []
  );

  if (!currentCase) return null;

  const { routingResult, intakeData } = currentCase;

  function toggleSegment(id: string) {
    const updated = segments.map((s) =>
      s.id === id ? { ...s, included: !s.included } : s
    );
    setSegments(updated);
    updateSegments(updated);
  }

  const includedCount = segments.filter((s) => s.included).length;
  const hasAnyIncluded = includedCount > 0;

  async function handleSend() {
    updateSegments(segments);
    await confirmHandoff();
  }

  const urgencyVariant = routingResult.urgencyLevel as "low" | "medium" | "high" | "crisis";

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FAF8F5" }}>
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

      <main className="flex-1 max-w-xl mx-auto w-full px-6 py-10 space-y-6">

        {/* Heading */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-4 h-4 text-teal-600" />
            <span className="text-sm font-medium text-teal-700">Review before sending</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 mb-2">
            Choose what to share with {routingResult.department.shortName}
          </h1>
          <p className="text-stone-600 text-sm leading-relaxed">
            Toggle off any part of your message you'd rather not share right now.
            The support team will see a note that some content was held back — but never the content itself.
          </p>
        </div>

        {/* Destination summary */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-500 mb-0.5">Sending to</p>
                <p className="font-semibold text-stone-900">{routingResult.department.name}</p>
              </div>
              <Badge variant={urgencyVariant}>
                {routingResult.urgencyLevel} priority
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Segment toggles */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Your message
              <span className="text-xs font-normal text-stone-400 ml-1">
                {includedCount}/{segments.length} parts included
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {segments.map((seg) => (
              <SegmentRow
                key={seg.id}
                segment={seg}
                onToggle={() => toggleSegment(seg.id)}
              />
            ))}
          </CardContent>
        </Card>

        {/* Context (always included) */}
        {intakeData.contextText && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-stone-500 mb-1">
                    Additional context{" "}
                    <span className="text-teal-600">· Always included</span>
                  </p>
                  <p className="text-sm text-stone-800">{intakeData.contextText}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Staff preview */}
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-2">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            Staff will see
          </p>
          <div className="text-sm text-stone-600 space-y-1">
            {segments.map((seg) =>
              seg.included ? (
                <p key={seg.id}>{seg.text}</p>
              ) : (
                <p key={seg.id} className="flex items-center gap-1.5">
                  <EyeOff className="w-3 h-3 text-amber-500 shrink-0" />
                  <Badge variant="restricted" className="text-[10px] py-0">
                    Restricted by student
                  </Badge>
                </p>
              )
            )}
          </div>
        </div>

        {/* Trust note */}
        <div className="flex items-start gap-2 text-xs text-stone-400">
          <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5 text-teal-600" />
          <span>
            Restricted content is never transmitted — only the label is sent,
            so staff know some context exists without seeing the details.
          </span>
        </div>

        {/* Send button */}
        <Button
          size="lg"
          className="w-full"
          onClick={handleSend}
          disabled={isLoading || !hasAnyIncluded}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              Send to {routingResult.department.shortName}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>

        {!hasAnyIncluded && (
          <p className="text-xs text-center text-amber-600">
            Include at least one part of your message to proceed.
          </p>
        )}

      </main>
    </div>
  );
}

function SegmentRow({
  segment,
  onToggle,
}: {
  segment: TextSegment;
  onToggle: () => void;
}) {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-150 ${
        segment.included
          ? "bg-white border-stone-200"
          : "bg-stone-50 border-stone-200 opacity-60"
      }`}
    >
      <Switch
        checked={segment.included}
        onCheckedChange={onToggle}
        aria-label={`Toggle: ${segment.text.slice(0, 40)}`}
        className="mt-0.5 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm leading-relaxed ${
            segment.included ? "text-stone-800" : "text-stone-400 line-through"
          }`}
        >
          {segment.text}
        </p>
        {segment.isSensitive && segment.included && (
          <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-amber-600">
            <Lock className="w-2.5 h-2.5" />
            Sensitive content
          </span>
        )}
      </div>
    </div>
  );
}
