import { useState } from "react";
import { AlertCircle, ArrowRight, Brain, Loader2, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/AppContext";

const MAX_CHARS = 2000;

const EXAMPLES = [
  {
    label: "Academic + wellbeing",
    urgency: "medium",
    tag: "rules",
    main: "I've been really struggling lately. My dissertation deadline is next week and I can't focus at all — I haven't been sleeping properly and I keep crying for no reason. I feel completely overwhelmed and don't know where to start.",
    context: "Final year student, living alone off-campus.",
  },
  {
    label: "Crisis",
    urgency: "crisis",
    tag: "rules",
    main: "I don't want to be here anymore. I've been thinking about hurting myself and I don't see any reason to keep going. I've been missing all my lectures and I can't talk to anyone about this.",
    context: "I've been feeling this way for about two weeks.",
  },
  {
    label: "In my own words",
    urgency: "?",
    tag: "ai",
    // Deliberately avoids dictionary keywords to trigger AI path
    main: "Things have just been really off lately. I can barely get myself to open my laptop most days. My head is just not in it and I keep putting everything off. I don't know what's wrong exactly but I feel like I'm running on empty.",
    context: "Second year, living in shared housing.",
  },
  {
    label: "Hinglish",
    urgency: "?",
    tag: "ai",
    // Romanized Hindi/Hinglish — low rules score, triggers AI path
    main: "Yaar mujhe samajh nahi aa raha kya karu. Padhne mein bilkul mann nahi lagta, ghar waale pressure de rahe hain aur hostel mein bhi akela feel hota hai. Bahut zyada pressure hai iss time.",
    context: "1st year engineering student.",
  },
];

export function IntakeScreen() {
  const { submitIntake, isLoading, error, goToQueue, session, goToMyRequests, logout, goToLanding } = useApp();
  const isStudent = session?.role === "student";
  const isGuest = !session || session.role === "guest";
  const [mainText, setMainText] = useState("");
  const [contextText, setContextText] = useState("");
  const [touched, setTouched] = useState(false);

  const mainEmpty = mainText.trim().length === 0;
  const overLimit = mainText.length > MAX_CHARS;
  const showError = touched && (mainEmpty || overLimit);
  const charsLeft = MAX_CHARS - mainText.length;

  function loadExample(ex: (typeof EXAMPLES)[number]) {
    setMainText(ex.main);
    setContextText(ex.context);
    setTouched(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (mainEmpty || overLimit) return;
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
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 bg-stone-100 px-3 py-1 rounded-full border border-stone-200 hidden sm:inline-flex">
              No Wrong Door
            </span>
            {isStudent && (
              <button
                onClick={goToMyRequests}
                className="text-xs text-teal-700 hover:bg-teal-50 border border-teal-200 hover:border-teal-400 px-3 py-1 rounded-full transition-all duration-150"
              >
                My Requests
              </button>
            )}
            {isStudent && (
              <button
                onClick={logout}
                className="text-xs text-stone-400 hover:text-stone-700 px-2 py-1 rounded-full transition-all duration-150"
              >
                Sign out
              </button>
            )}
            {isGuest && (
              <button
                onClick={goToQueue}
                className="text-xs text-stone-400 hover:text-teal-700 hover:bg-teal-50 border border-stone-200 hover:border-teal-300 px-3 py-1 rounded-full transition-all duration-150"
              >
                Staff view →
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">

          {/* Signed-in greeting */}
          {isStudent && session && (
            <div className="mb-6 flex items-center gap-2 text-sm text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-4 py-2.5">
              <span>Welcome back, <strong>{session.name}</strong>.</span>
              <button onClick={goToMyRequests} className="ml-auto text-xs underline underline-offset-2 hover:text-teal-900 transition-colors">
                View my requests →
              </button>
            </div>
          )}

          {/* Hero */}
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
                  {ex.tag === "ai" ? (
                    <Brain className="w-3 h-3 text-violet-500" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  {ex.label}
                  <span
                    className={`ml-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      ex.urgency === "crisis"
                        ? "bg-amber-100 text-amber-800"
                        : ex.tag === "ai"
                        ? "bg-violet-50 text-violet-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {ex.tag === "ai" ? "AI path" : ex.urgency}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="main-text" className="block text-sm font-medium text-stone-800">
                  What's going on?{" "}
                  <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <span
                  className={`text-xs tabular-nums ${
                    overLimit ? "text-red-500 font-semibold" : charsLeft < 200 ? "text-amber-600" : "text-stone-400"
                  }`}
                >
                  {charsLeft < 0 ? `${Math.abs(charsLeft)} over limit` : `${charsLeft} remaining`}
                </span>
              </div>
              <Textarea
                id="main-text"
                placeholder="Share as much or as little as you're comfortable with. There are no wrong answers."
                value={mainText}
                onChange={(e) => {
                  setMainText(e.target.value);
                  if (touched && e.target.value.trim() && e.target.value.length <= MAX_CHARS)
                    setTouched(false);
                }}
                onBlur={() => setTouched(true)}
                error={showError}
                rows={6}
                aria-describedby={showError ? "main-text-error" : "main-text-hint"}
                aria-required="true"
                className="text-base"
              />
              {showError ? (
                <p
                  id="main-text-error"
                  role="alert"
                  className="mt-2 text-sm text-red-600 flex items-center gap-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {overLimit
                    ? `Please keep your message under ${MAX_CHARS} characters.`
                    : "Please share a little about what's going on so we can help."}
                </p>
              ) : null}
            </div>

            <div className="mb-5">
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

            {/* AI privacy note */}
            <div className="mb-4 flex items-start gap-2 text-xs text-stone-400">
              <Brain className="w-3.5 h-3.5 shrink-0 mt-0.5 text-violet-400" />
              <span id="main-text-hint">
                Unusual wording? An AI model helps sort it. No name or ID is sent.
              </span>
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
              disabled={isLoading || overLimit}
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

          {/* Guest notice — sending requires sign-in (crisis always works) */}
          {isGuest && (
            <div className="mt-4 flex items-start gap-2 text-xs text-stone-400 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2.5">
              <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5 text-stone-300" />
              <span>
                You're browsing as a guest. You can explore triage and see your routing — but{" "}
                <strong className="text-stone-600">sending to the support team requires signing in</strong>
                {" "}so they can reach you.{" "}
                <button
                  type="button"
                  onClick={() => goToLanding()}
                  className="text-teal-600 underline underline-offset-2 hover:text-teal-800 transition-colors"
                >
                  Sign in
                </button>
                {" "}— crisis help always works without an account.
              </span>
            </div>
          )}

          {/* Trust signal */}
          <div className="mt-6 flex items-start gap-2 text-xs text-stone-400">
            <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5 text-teal-600" />
            <span>
              What you share stays within your university's support team.
              You'll choose exactly what gets forwarded before anything is sent.
            </span>
          </div>

          {/* Footer disclaimer */}
          <p className="mt-4 text-center text-xs text-stone-300">
            CampusReach helps you find support. It is not a medical diagnosis or an emergency service.
          </p>
        </div>
      </main>
    </div>
  );
}
