/**
 * ChatWidget — floating AI support assistant.
 * Renders a chat bubble in the bottom-right corner.
 * Visible on student-facing screens (intake, result, my-requests).
 * Hidden on staff/admin screens and on the login screen.
 *
 * Uses KB matching first (instant), falls back to Gemini if available.
 */

import { useEffect, useRef, useState } from "react";
import { Bot, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { useApp } from "@/lib/AppContext";
import { generateChatAnswer, QUICK_REPLIES } from "@/lib/chatbot";

interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
}

const GREETING: Message = {
  id: "greeting",
  role: "bot",
  text: "Hi! I'm CampusReach Assistant. Ask me about support services, wait times, office locations, or anything else — or start a new request any time.",
};

export function ChatWidget() {
  const { session } = useApp();

  // Hide on staff/admin/login screens
  const role = session?.role ?? "guest";
  if (role === "staff" || role === "admin") return null;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send(text: string) {
    if (!text.trim() || busy) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", text: text.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setBusy(true);

    const hasGemini = !!(import.meta.env.VITE_GEMINI_API_KEY as string | undefined);
    const answer = await generateChatAnswer(text, hasGemini);

    const botMsg: Message = {
      id: `b-${Date.now()}`,
      role: "bot",
      text: answer ??
        "I'm not sure I caught that. Try asking about wait times, office locations, privacy, or how routing works. Or submit a request and we'll route you to the right team.",
    };
    setMessages((m) => [...m, botMsg]);
    setBusy(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-teal-600 text-white shadow-lg flex items-center justify-center hover:bg-teal-700 transition-all duration-200 hover:scale-105"
          aria-label="Open chat assistant"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-white animate-pulse-soft" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-40 w-[calc(100vw-3rem)] sm:w-96 max-h-[32rem] flex flex-col bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
          {/* Header */}
          <div className="bg-teal-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">CampusReach Assistant</p>
                <p className="text-[10px] text-white/70 leading-tight">AI-powered · KB + Gemini</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-stone-50">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] text-sm rounded-2xl px-3.5 py-2 ${
                    m.role === "user"
                      ? "bg-teal-600 text-white rounded-br-sm"
                      : "bg-white border border-stone-200 text-stone-800 rounded-bl-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="bg-white border border-stone-200 text-stone-400 text-sm rounded-2xl px-3.5 py-2 rounded-bl-sm">
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick replies */}
          {messages.length <= 2 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {QUICK_REPLIES.slice(0, 3).map((qr) => (
                <button
                  key={qr}
                  onClick={() => send(qr)}
                  className="text-xs text-teal-700 bg-teal-50 border border-teal-100 hover:bg-teal-100 rounded-full px-2.5 py-1 transition-colors"
                >
                  {qr}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t border-stone-200 px-3 py-2.5 flex items-center gap-2 bg-white">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about support, wait times, locations…"
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-stone-400 text-stone-800"
              disabled={busy}
              aria-label="Type your question"
            />
            <button
              type="submit"
              disabled={!input.trim() || busy}
              className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center disabled:opacity-40 hover:bg-teal-700 transition-colors"
              aria-label="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
