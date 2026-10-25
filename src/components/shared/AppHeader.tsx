/**
 * Shared AppHeader — used by every screen that has a top bar.
 * Right side adapts by role:
 *   guest   → "Sign in"
 *   student → "My requests" (dot on unseen) + name + Sign out
 *   staff   → "Queue" + "Name – Department" + Sign out
 *   admin   → "Queue" + "Insights" + Sign out
 */

import { LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/AppContext";
import { NotificationCenter } from "./NotificationCenter";

interface AppHeaderProps {
  /** Override max-width; defaults to max-w-2xl */
  maxWidth?: string;
  /** Show Staff view badge */
  staffBadge?: boolean;
  /** Right slot override — if provided, replaces default role-based right side */
  rightSlot?: React.ReactNode;
}

export function AppHeader({ maxWidth = "max-w-2xl", staffBadge, rightSlot }: AppHeaderProps) {
  const {
    session,
    logout,
    goToQueue,
    goToAdmin,
    goToMyRequests,
    goToLanding,
    studentCases,
  } = useApp();

  const role = session?.role ?? "guest";

  // Unseen updates = any student case with a recent viewed event the student
  // hasn't acknowledged — simplified: any case where firstViewedAt is set
  // and the student hasn't navigated to My Requests since (we track via a
  // simple localStorage flag in AppContext).
  const hasUnseenUpdates = studentCases.some(
    (c) => c.firstViewedAt && !c.revokedAt
  );

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className={`${maxWidth} mx-auto px-6 py-4 flex items-center justify-between`}>

        {/* Left: logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-stone-900 tracking-tight">CampusReach</span>
          {staffBadge && (
            <span className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full font-medium">
              Staff view
            </span>
          )}
        </div>

        {/* Right */}
        {rightSlot ?? (
          <div className="flex items-center gap-2">
            <NotificationCenter />

            {role === "guest" && (
              <Button variant="outline" size="sm" onClick={goToLanding}>
                Sign in
              </Button>
            )}

            {role === "student" && (
              <>
                <button
                  onClick={goToMyRequests}
                  className="relative text-xs text-teal-700 hover:bg-teal-50 border border-teal-200 hover:border-teal-400 px-3 py-1.5 rounded-full transition-all duration-150"
                  aria-label="My requests"
                >
                  My requests
                  {hasUnseenUpdates && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 border-2 border-white"
                      aria-label="New updates"
                    />
                  )}
                </button>
                <span className="hidden sm:block text-xs text-stone-500 font-medium pl-1">
                  {session?.name}
                </span>
                <Button variant="ghost" size="sm" onClick={logout} aria-label="Sign out">
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign out</span>
                </Button>
              </>
            )}

            {role === "staff" && (
              <>
                <button
                  onClick={goToQueue}
                  className="text-xs text-stone-500 hover:text-teal-700 transition-colors px-2 py-1"
                >
                  Queue
                </button>
                <span className="hidden sm:block text-xs text-stone-400 pl-1">
                  {session?.name}
                  {session?.department ? ` — ${session.department}` : ""}
                </span>
                <Button variant="ghost" size="sm" onClick={logout} aria-label="Sign out">
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign out</span>
                </Button>
              </>
            )}

            {role === "admin" && (
              <>
                <button
                  onClick={goToQueue}
                  className="text-xs text-stone-500 hover:text-teal-700 transition-colors px-2 py-1"
                >
                  Queue
                </button>
                <button
                  onClick={goToAdmin}
                  className="text-xs text-stone-500 hover:text-teal-700 transition-colors px-2 py-1"
                >
                  Insights
                </button>
                <Button variant="ghost" size="sm" onClick={logout} aria-label="Sign out">
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign out</span>
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
