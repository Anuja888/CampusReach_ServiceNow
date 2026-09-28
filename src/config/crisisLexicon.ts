/**
 * Crisis phrase lexicon — authoritative list used by the classifier.
 * ANY match here immediately triggers the crisis path; AI is never
 * consulted to lower this determination.
 *
 * English phrases are first; romanized Hindi/Telugu/Hinglish phrases
 * are in the second block — needs native-speaker review before production.
 */

export const CRISIS_PHRASES: string[] = [
  // ── English ──────────────────────────────────────────────────────────────
  "suicide",
  "suicidal",
  "kill myself",
  "killing myself",
  "end my life",
  "end it all",
  "take my own life",
  "don't want to be here",
  "dont want to be here",
  "don't want to live",
  "dont want to live",
  "no reason to live",
  "not worth living",
  "want to die",
  "wishing i was dead",
  "wish i was dead",
  "wish i were dead",
  "self harm",
  "self-harm",
  "selfharm",
  "cutting myself",
  "cut myself",
  "hurting myself",
  "hurt myself",
  "harming myself",
  "harm myself",
  "overdose",
  "overdosing",
  "can't go on",
  "cannot go on",
  "can't take it anymore",
  "cannot take it anymore",
  "nothing left to live for",
  "no point in living",
  "rather be dead",
  "better off dead",
  "better off without me",

  // ── Romanized Hindi / Hinglish ────────────────────────────────────────────
  // needs native-speaker review before production
  "marna chahta hoon",       // "I want to die" (male speaker)
  "marna chahti hoon",       // "I want to die" (female speaker)
  "mar jaana chahta hoon",   // "I want to go die"
  "mar jaana chahti hoon",
  "zindagi nahi chahiye",    // "I don't want life"
  "jeena nahi chahta",       // "I don't want to live" (male)
  "jeena nahi chahti",       // "I don't want to live" (female)
  "khud ko khatam karna",    // "to finish/end myself"
  "khatam kar lunga",        // "I will end it" (male)
  "khatam kar lungi",        // "I will end it" (female)
  "khud ko hurt karna",      // "hurting myself" (Hinglish hybrid)
  "apne aap ko hurt karna",  // "hurting myself"

  // ── Romanized Telugu ─────────────────────────────────────────────────────
  // needs native-speaker review before production
  "nenu chachipothanu",      // "I will die" / "I am going to die"
  "naaku jeevitam vaddu",    // "I don't want life"
  "nenu pothanu",            // colloquial "I'm going to end it"
];

/** Lowercase the lexicon once for fast comparison */
export const CRISIS_PHRASES_LOWER: string[] = CRISIS_PHRASES.map((p) =>
  p.toLowerCase()
);
