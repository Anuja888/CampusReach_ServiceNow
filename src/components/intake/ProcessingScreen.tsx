import { motion } from "framer-motion";
import { Shield } from "lucide-react";

const steps = [
  "Reading your message…",
  "Scoring for urgency…",
  "Matching to the right team…",
];

export function ProcessingScreen() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: "#FAF8F5" }}
    >
      <div className="w-full max-w-sm text-center">
        {/* Animated icon */}
        <motion.div
          className="w-16 h-16 rounded-2xl bg-teal-600 flex items-center justify-center mx-auto mb-8"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <Shield className="w-8 h-8 text-white" />
        </motion.div>

        <h2 className="text-xl font-semibold text-stone-900 mb-2">
          Reviewing your message
        </h2>
        <p className="text-stone-500 text-sm mb-8">This usually takes a moment.</p>

        <div className="space-y-3">
          {steps.map((step, i) => (
            <motion.div
              key={step}
              className="flex items-center gap-3 text-sm text-left"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.35, duration: 0.4, ease: "easeOut" }}
            >
              <motion.div
                className="w-2 h-2 rounded-full bg-teal-600 shrink-0"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.35 + 0.1, type: "spring", stiffness: 400 }}
              />
              <span className="text-stone-600">{step}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
