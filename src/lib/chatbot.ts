/**
 * Knowledge base + intent matching for the chatbot.
 * Pure functions, no side effects.
 * If Gemini key is available the chatbot uses AI for free-form answers;
 * otherwise it falls back to keyword-matched KB entries.
 */

import type { Category } from "@/types";
import { DEPARTMENTS } from "./routing";

export interface KBEntry {
  id: string;
  keywords: string[];            // any of these triggers this entry
  category?: Category;
  question: string;               // canonical phrasing
  answer: string;
}

export const KNOWLEDGE_BASE: KBEntry[] = [
  {
    id: "wait-times",
    keywords: ["wait", "how long", "when", "appointment time", "queue", "fast", "soon"],
    question: "How long is the wait?",
    answer:
      "It depends on the team. Crisis line answers within minutes (24×7). Wellbeing: 2–3 working days. Academic Support: same day. Financial Aid: 1–2 days. You'll see the typical wait on your routing result.",
  },
  {
    id: "where-wellbeing",
    keywords: ["where", "location", "wellbeing office", "counsellor office", "find wellbeing"],
    category: "mental_health",
    question: "Where is the Wellbeing office?",
    answer:
      "Student Wellbeing Service is in Block C, Room 204. Office hours: Monday–Friday 10:00–18:00. Please check in at reception on arrival.",
  },
  {
    id: "where-academic",
    keywords: ["academic support", "extension", "deadline help", "study skills"],
    category: "academic_stress",
    question: "Where is Academic Support?",
    answer:
      "Academic Support & Advising is in Academic Block A, Room 310. Office hours: Mon–Fri 09:00–17:00. Drop-in slots 13:00–14:00 daily.",
  },
  {
    id: "where-financial",
    keywords: ["financial", "money help", "scholarship", "bursary", "fees", "hardship"],
    category: "financial",
    question: "Where do I go for financial help?",
    answer:
      "Financial Aid & Hardship Fund is in Admin Block, Room 105. Office hours: Mon–Fri 10:00–16:00. They handle emergency bursaries, scholarship issues, and fee delays.",
  },
  {
    id: "where-housing",
    keywords: ["housing", "hostel", "accommodation", "eviction", "rent"],
    category: "housing",
    question: "Where is the Housing office?",
    answer:
      "Student Housing & Accommodation is in Hostel Office, Block D, Room 12. Office hours: Mon–Fri 09:00–17:00. For emergencies call campus security on ext. 999.",
  },
  {
    id: "what-is-no-wrong-door",
    keywords: ["no wrong door", "what is campusreach", "how does this work", "what does it do"],
    question: "What is CampusReach?",
    answer:
      "CampusReach helps you find the right support without having to know which department to contact. Tell us what's going on in your own words — we route you to the right team and make sure you only have to say it once.",
  },
  {
    id: "crisis-immediate",
    keywords: ["crisis", "emergency", "suicide", "hurt myself", "self harm", "urgent", "now", "immediate"],
    category: "crisis",
    question: "I need help right now",
    answer:
      "You don't have to wait. Call Tele-MANAS on 14416 (free, 24×7, multiple languages) or 1-800-891-4416. If you're in immediate danger, call 112. You can also submit a message here — if our system detects crisis signals, you'll see immediate contact options with no queue.",
  },
  {
    id: "privacy",
    keywords: ["privacy", "who sees", "confidential", "safe", "share", "data"],
    question: "Is my data private?",
    answer:
      "Your message stays within the university support team. Before anything is sent, you choose exactly what gets forwarded — you can toggle off any part of your message. Restricted content is never transmitted to staff.",
  },
  {
    id: "ai-classification",
    keywords: ["ai", "how does it decide", "who decides", "routing", "classify", "model"],
    question: "How does CampusReach decide who to send me to?",
    answer:
      "We use a hybrid system: rule-based keyword matching handles most cases transparently (you can see exactly which words triggered the route). For unusual phrasing, an AI model helps sort it — but it's always checked against safety rules, and no name or ID is sent to the model.",
  },
  {
    id: "withdraw",
    keywords: ["withdraw", "cancel", "take back", "remove", "delete my request"],
    question: "Can I cancel my request?",
    answer:
      "Yes. You can withdraw a request at any time before a staff member first opens it. After that, the case is in the active workflow — but you can still contact the team to close it.",
  },
  {
    id: "guest",
    keywords: ["guest", "without signing in", "no account", "do i need to sign in"],
    question: "Do I need an account?",
    answer:
      "You can explore triage and see your routing as a guest. Sending a request to the support team requires signing in so they can reach you. Crisis help is always available without an account.",
  },
];

/** Score an entry against the user's message — returns 0 if no keywords match */
function scoreEntry(entry: KBEntry, message: string): number {
  const lower = message.toLowerCase();
  let score = 0;
  for (const kw of entry.keywords) {
    if (lower.includes(kw)) score += kw.length; // longer matches weigh more
  }
  return score;
}

/** Find the best matching KB entry, or null */
export function matchKB(message: string): KBEntry | null {
  let best: KBEntry | null = null;
  let bestScore = 0;
  for (const entry of KNOWLEDGE_BASE) {
    const s = scoreEntry(entry, message);
    if (s > bestScore) {
      bestScore = s;
      best = entry;
    }
  }
  return best;
}

/** Quick-reply suggestions shown in the chatbot */
export const QUICK_REPLIES: string[] = [
  "How long is the wait?",
  "Where is the Wellbeing office?",
  "Is my data private?",
  "I need help right now",
  "How does routing work?",
];

/**
 * Optional: generate an AI answer using Gemini if a key is set.
 * Falls back to KB match. Returns null if neither works.
 */
export async function generateChatAnswer(
  question: string,
  hasGemini: boolean
): Promise<string | null> {
  // Try KB first — instant, no network
  const kb = matchKB(question);
  if (kb) return kb.answer;

  // If Gemini is available and KB didn't match, try AI
  if (hasGemini) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
    if (!apiKey) return null;
    try {
      const prompt = `You are a friendly campus support assistant. A student asked: "${question}". Give a short (max 2 sentences), warm, helpful answer. If this sounds like a crisis, tell them to call Tele-MANAS 14416 immediately.`;
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 120 },
          }),
        }
      );
      if (!resp.ok) return null;
      const data = await resp.json();
      const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      return text.trim() || null;
    } catch {
      return null;
    }
  }
  return null;
}
