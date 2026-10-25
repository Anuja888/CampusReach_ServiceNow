/**
 * NotificationCenter — bell icon in AppHeader with unseen-updates dot.
 * Dropdown lists recent case events visible to the student.
 * Lives inside AppHeader, so it's automatically on every screen.
 */

import { useEffect, useRef, useState } from "react";
import { Bell, Check } from "lucide-react";
import { useApp } from "@/lib/AppContext";
import type { CaseEvent } from "@/types";

const LAST_SEEN_KEY = "campusreach_notifications_last_seen";

function getLastSeen(): number {
  try {
    return parseInt(localStorage.getItem(LAST_SEEN_KEY) ?? "0", 10);
  } catch {
    return 0;
  }
}

function setLastSeen(ts: number) {
  try { localStorage.setItem(LAST_SEEN_KEY, String(ts)); } catch { /* */ }
}

function formatRelTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationCenter() {
  const { session, studentCases } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Only students get notifications
  if (session?.role !== "student") return null;

  // Gather all visible-to-student events across the student's cases, newest first
  const allEvents: { event: CaseEvent; caseId: string }[] = [];
  for (const c of studentCases) {
    for (const ev of c.events) {
      if (ev.visibleToStudent && ev.type !== "submitted") {
        allEvents.push({ event: ev, caseId: c.id });
      }
    }
  }
  allEvents.sort((a, b) => new Date(b.event.timestamp).getTime() - new Date(a.event.timestamp).getTime());

  const lastSeen = getLastSeen();
  const unseen = allEvents.filter((e) => new Date(e.event.timestamp).getTime() > lastSeen);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function handleOpen() {
    const newOpen = !open;
    setOpen(newOpen);
    if (newOpen && allEvents.length > 0) {
      const latest = new Date(allEvents[0].event.timestamp).getTime();
      setLastSeen(latest);
    }
  }

  function eventLabel(ev: CaseEvent): string {
    const labels: Partial<Record<CaseEvent["type"], string>> = {
      viewed: `${ev.actor} opened your request`,
      assigned: `${ev.actor} accepted your request`,
      appointment_offered: `Appointment offered`,
      acknowledged: `Crisis acknowledged by ${ev.actor}`,
      rerouted: `Rerouted to a different team`,
      escalated: `Case escalated`,
      status_changed: `Status updated`,
      routed: `Routed to support team`,
      withdrawn: `Request withdrawn`,
    };
    return labels[ev.type] ?? ev.type.replace(/_/g, " ");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative p-1.5 rounded-full text-stone-400 hover:text-teal-700 hover:bg-teal-50 transition-colors"
        aria-label={`Notifications${unseen.length > 0 ? ` (${unseen.length} new)` : ""}`}
      >
        <Bell className="w-4 h-4" />
        {unseen.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full bg-amber-500 border-2 border-white flex items-center justify-center">
            <span className="text-[8px] font-bold text-white leading-none">{unseen.length > 9 ? "9+" : unseen.length}</span>
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl border border-stone-200 shadow-xl overflow-hidden z-50">
          <div className="px-3 py-2 border-b border-stone-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider">Notifications</span>
            {allEvents.length > 0 && (
              <button
                onClick={() => {
                  const latest = new Date(allEvents[0].event.timestamp).getTime();
                  setLastSeen(latest);
                }}
                className="text-xs text-teal-600 hover:text-teal-800"
              >
                <Check className="w-3 h-3 inline" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto">
            {allEvents.length === 0 ? (
              <p className="px-3 py-6 text-xs text-stone-400 text-center">No notifications yet.</p>
            ) : (
              allEvents.slice(0, 12).map(({ event, caseId }) => {
                const isNew = new Date(event.timestamp).getTime() > lastSeen;
                return (
                  <div
                    key={event.id}
                    className={`px-3 py-2 border-b border-stone-50 last:border-0 ${isNew ? "bg-teal-50/40" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${isNew ? "bg-amber-500" : "bg-stone-200"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-stone-700 leading-snug">{eventLabel(event)}</p>
                        <p className="text-[10px] text-stone-400 mt-0.5">
                          Case #{caseId.slice(-4).toUpperCase()} · {formatRelTime(event.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
