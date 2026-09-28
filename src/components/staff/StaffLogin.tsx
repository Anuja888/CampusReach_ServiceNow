/**
 * Legacy StaffLogin — superseded by LoginScreen.
 * This component is kept to avoid a broken import but immediately
 * redirects to the unified login screen. No credentials rendered here.
 */

import { useEffect } from "react";
import { useApp } from "@/lib/AppContext";

export function StaffLogin() {
  const { goToLanding } = useApp();
  useEffect(() => { goToLanding(); }, [goToLanding]);
  return null;
}
