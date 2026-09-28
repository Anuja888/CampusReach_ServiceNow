import { useState } from "react";
import { AlertCircle, ArrowRight, Loader2, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/AppContext";
const EXAMPLES = [
  {
    label: "Academic + wellbeing",
    urgency: "medium",
    main: "I've been really struggling lately. My dissertation deadline is next week and I can't focus at all — I haven't been sleeping properly and I keep crying for no reason. I feel completely overwhelmed and don't know where to start.",
    context: "Final year student, living alone off-campus.",
  },
  {
    label: "Crisis",
    urgency: "crisis",
    main: "I don't want to be here anymore. I've been thinking about hurting myself and I don't see any reason to keep going. I've been missing all my lectures and I can't talk to anyone about this.",
    context: "I've been feeling this way for about two weeks.",
  },
];

export function IntakeScreen() {
  const { submitIntake, isLoading, error, goToQueue } = useApp();
  const [mainText, setMainText] = useState("");
  const [contextText, setContextText] = useState("");
  const [touched, setTouched] = useState(false);

  const mainEmpty = mainText.trim().length === 0;
  const showError = touched && mainEmpty;

  function loadExample(ex: (typeof EXAMPLES)[number]) {
    setMainText(ex.main);
    setContextText(ex.context);
    setTouched(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (mainEmpty) return;
    await submitIntake({ mainText: mainText.trim(), contextText: contextText.trim() });
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FAF8F5" }}>
      {/* Header */}
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-stone-900 tracking-tight">CampusReach</span>
          </div>
          <span className="text-xs text-stone-500 bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
            No Wrong Door
          </span>
          <button
            onClick={goToQueue}
            className="text-xs text-stone-400 hover:text-teal-700 hover:bg-teal-50 border border-stone-200 hover:border-teal-300 px-3 py-1 rounded-full transition-all duration-150"
          >
            Staff view →
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">

          {/* Hero copy */}
          <div className="mb-10">
            <h1 className="text-4xl font-bold text-stone-900 leading-tight mb-3">
              You don't need to know<br />who to talk to.
            </h1>
            <p className="text-lg text-stone-600 leading-relaxed">
              Tell us what's going on in your own words. We'll figure out the
              right support and make sure you only have to say it once.
            </p>
          </div>

          {/* Example chips */}
          <div className="mb-6">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2.5">
              Try an example
            </p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => loadExample(ex)}
                  className="inline-flex items-center gap-1.5 text-sm px-3.5 py-1.5 rounded-full border border-stone-200 bg-white text-stone-600 hover:border-teal-400 hover:text-teal-700 hover:bg-teal-50 transition-all duration-150 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  {ex.label}
                  <span
                    className={`ml-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      ex.urgency === "crisis"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {ex.urgency}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label htmlFor="main-text" className="block text-sm font-medium text-stone-800 mb-1.5">
                What's going on?{" "}
                <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <Textarea
                id="main-text"
                placeholder="Share as much or as little as you're comfortable with. There are no wrong answers."
                value={mainText}
                onChange={(e) => {
                  setMainText(e.target.value);
                  if (touched && e.target.value.trim()) setTouched(false);
                }}
                onBlur={() => setTouched(true)}
                error={showError}
                rows={6}
                aria-describedby={showError ? "main-text-error" : undefined}
                aria-required="true"
                className="text-base"
              />
              {showError && (
                <p
                  id="main-text-error"
                  role="alert"
                  className="mt-2 text-sm text-red-600 flex items-center gap-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Please share a little about what's going on so we can help.
                </p>
              )}
            </div>

            <div className="mb-6">
              <label htmlFor="context-text" className="block text-sm font-medium text-stone-800 mb-1.5">
                Any helpful context?{" "}
                <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <Input
                id="context-text"
                type="text"
                placeholder="e.g. year of study, living situation, how long this has been going on"
                value={contextText}
                onChange={(e) => setContextText(e.target.value)}
              />
            </div>

            {error && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={isLoading}
              className="w-full h-13 text-base"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Finding the right support…
                </>
              ) : (
                <>
                  Find my support
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Trust signal */}
          <div className="mt-6 flex items-start gap-2 text-xs text-stone-400">
            <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5 text-teal-600" />
            <span>
              What you share stays within your university's support team.
              You'll choose exactly what gets forwarded before anything is sent.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
