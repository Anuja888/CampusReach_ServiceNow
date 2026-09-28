import { motion } from "framer-motion";
import { Phone, MessageCircle, Heart, ArrowRight, Shield, Info } from "lucide-react";
import { useApp } from "@/lib/AppContext";
import { CONTACTS } from "@/config/contacts";

const crisisEntrance = {
  hidden: { opacity: 0, scale: 0.97 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as number[] } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } } };
const fade = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } };

export function CrisisScreen() {
  const { resetToIntake, currentCase, session } = useApp();
  const explanation = currentCase?.routingResult?.explanation;
  const matchedKeywords = currentCase?.routingResult?.matchedKeywords ?? [];
  const isGuest = !session || session.role === "guest";

  return (
    <motion.div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FFF7ED" }} variants={crisisEntrance} initial="hidden" animate="show">
      <div className="bg-amber-600 text-white px-6 py-3 flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse-soft" />
        <span className="text-sm font-semibold tracking-wide">Immediate support available now</span>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-lg mx-auto w-full">
        <motion.div variants={stagger} initial="hidden" animate="show" className="w-full space-y-5">

          <motion.div variants={fade} className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-600 flex items-center justify-center mx-auto mb-5 shadow-crisis">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-amber-900 leading-tight mb-3">
              You don't need to wait for this.
            </h1>
            <p className="text-amber-800 text-base leading-relaxed">
              We've connected you directly to immediate support — a real person is available right now, no queue.
            </p>
            {!isGuest && (
              <p className="mt-2 text-sm text-amber-700 bg-amber-100 border border-amber-200 rounded-lg px-3 py-2 inline-block">
                Our on-call counsellor has been alerted.
              </p>
            )}
          </motion.div>

          {/* Primary CTA — Tele-MANAS */}
          <motion.div variants={fade}>
            <a href={`tel:${CONTACTS.crisisLine.number}`} className="flex items-center gap-4 p-5 rounded-xl bg-amber-600 text-white shadow-crisis hover:bg-amber-700 transition-all duration-150 group">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0 group-hover:bg-white/30 transition-colors">
                <Phone className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-lg leading-tight">{CONTACTS.crisisLine.name}</p>
                <p className="text-white/80 text-sm">{CONTACTS.crisisLine.number} / {CONTACTS.crisisLine.altNumber} · Free · {CONTACTS.crisisLine.available}</p>
              </div>
              <ArrowRight className="w-5 h-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </a>
          </motion.div>

          {/* Secondary CTA — counsellor on-call */}
          <motion.div variants={fade}>
            <a href={`tel:${CONTACTS.counsellorOnCall.number}`} className="flex items-center gap-4 p-5 rounded-xl bg-white border-2 border-amber-200 text-amber-900 hover:border-amber-500 transition-all duration-150 group">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <MessageCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold leading-tight">{CONTACTS.counsellorOnCall.name}</p>
                <p className="text-amber-700 text-sm">{CONTACTS.counsellorOnCall.available}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-amber-400 group-hover:text-amber-700 group-hover:translate-x-0.5 transition-all" />
            </a>
          </motion.div>

          {/* Why this route */}
          <motion.div variants={fade}>
            <div className="rounded-xl bg-white border border-amber-200 p-4">
              <div className="flex gap-3">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">
                    Why this route
                    <span className="ml-2 font-normal normal-case text-stone-400">· Rule-based scoring — no black box</span>
                  </p>
                  <p className="text-sm text-stone-600 leading-relaxed">
                    {explanation ?? "Your message indicated you may need urgent support — we're connecting you directly, no queue."}
                  </p>
                  {matchedKeywords.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {matchedKeywords.slice(0, 5).map((kw) => (
                        <span key={kw.word} className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-100">{kw.word}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* On-campus */}
          <motion.div variants={fade}>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-amber-200">
              <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-900 mb-0.5">On campus right now?</p>
                <p className="text-amber-700">{CONTACTS.wellbeingCentre.description}</p>
              </div>
            </div>
          </motion.div>

          <motion.div variants={fade} className="text-center pt-1">
            <p className="text-sm text-amber-700/60">When you're ready, we can also connect you with ongoing support.</p>
            <button onClick={resetToIntake} className="mt-3 text-sm text-amber-700 font-medium hover:text-amber-900 transition-colors underline underline-offset-2">
              Back to the support finder
            </button>
          </motion.div>

        </motion.div>
      </main>

      <footer className="text-center py-3 text-xs text-amber-700/40">
        CampusReach helps you find support. It is not a medical diagnosis or an emergency service.
      </footer>
    </motion.div>
  );
}
