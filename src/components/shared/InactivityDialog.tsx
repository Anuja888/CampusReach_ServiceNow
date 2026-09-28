/**
 * Inactivity warning dialog — shown to staff/admin only.
 * Warns 1 minute before auto sign-out.
 */

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/lib/AppContext";
import { INACTIVITY_LIMIT_MS, INACTIVITY_WARN_MS, touchSession, getLastActiveAt } from "@/lib/auth";

const WARN_WINDOW_MS = INACTIVITY_LIMIT_MS - INACTIVITY_WARN_MS; // 1 min

export function InactivityGuard() {
  const { session, logout, touchActivity } = useApp();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isStaff = session?.role === "staff" || session?.role === "admin";

  useEffect(() => {
    if (!isStaff) return;

    function tick() {
      const idle = Date.now() - getLastActiveAt();
      if (idle >= INACTIVITY_LIMIT_MS) {
        logout();
        return;
      }
      if (idle >= INACTIVITY_WARN_MS) {
        setShowWarning(true);
        setCountdown(Math.ceil((INACTIVITY_LIMIT_MS - idle) / 1000));
      } else {
        setShowWarning(false);
      }
    }

    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isStaff, logout]);

  function handleStaySignedIn() {
    touchActivity();
    setShowWarning(false);
  }

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <Card className="w-full max-w-sm mx-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Still there?</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <p className="text-sm text-stone-600">
            You'll be signed out in{" "}
            <span className="font-bold tabular-nums text-stone-900">{countdown}s</span>{" "}
            due to inactivity.
          </p>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleStaySignedIn}>
              Stay signed in
            </Button>
            <Button variant="ghost" className="flex-1" onClick={logout}>
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
