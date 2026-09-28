import { useState } from "react";
import { AlertCircle, KeyRound, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useApp } from "@/lib/AppContext";

// Basic email pattern — same intent as HTML email input validation
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function StaffLogin() {
  const { loginStaff, resetToIntake } = useApp();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [emailTouched, setEmailTouched]       = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // ── Field-level validation ──────────────────────────────────────────────
  const emailEmpty   = email.trim().length === 0;
  const emailInvalid = !emailEmpty && !EMAIL_RE.test(email.trim());
  const passwordEmpty = password.length === 0;

  const showEmailError    = emailTouched && (emailEmpty || emailInvalid);
  const showPasswordError = passwordTouched && passwordEmpty;

  function emailErrorMsg() {
    if (emailEmpty)   return "Email is required.";
    if (emailInvalid) return "Please enter a valid email address.";
    return "";
  }

  // ── Submit ──────────────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailTouched(true);
    setPasswordTouched(true);
    setAuthError(null);

    if (emailEmpty || emailInvalid || passwordEmpty) return;

    const ok = loginStaff(email.trim(), password);
    if (!ok) {
      setAuthError("Those credentials don't match our records. Check the hint below.");
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: "#FAF8F5" }}
    >
      {/* Narrow centered card — same max-width feel as IntakeScreen */}
      <div className="w-full max-w-sm">

        {/* Wordmark */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-stone-900 tracking-tight">
            CampusReach
          </span>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 mb-1">
              <KeyRound className="w-4 h-4 text-teal-600" />
              <CardTitle className="text-base">Staff sign-in</CardTitle>
            </div>
            <CardDescription>
              Access the case queue and student referrals.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-0">
            <form onSubmit={handleSubmit} noValidate className="space-y-4">

              {/* Email */}
              <div>
                <label
                  htmlFor="staff-email"
                  className="block text-sm font-medium text-stone-800 mb-1.5"
                >
                  Email address <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <Input
                  id="staff-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@university.edu"
                  value={email}
                  error={showEmailError}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setAuthError(null);
                  }}
                  onBlur={() => setEmailTouched(true)}
                  aria-describedby={showEmailError ? "email-err" : undefined}
                />
                {showEmailError && (
                  <p
                    id="email-err"
                    role="alert"
                    className="mt-1.5 text-sm text-red-600 flex items-center gap-1.5"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {emailErrorMsg()}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="staff-password"
                  className="block text-sm font-medium text-stone-800 mb-1.5"
                >
                  Password <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <Input
                  id="staff-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  error={showPasswordError}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setAuthError(null);
                  }}
                  onBlur={() => setPasswordTouched(true)}
                  aria-describedby={showPasswordError ? "pw-err" : undefined}
                />
                {showPasswordError && (
                  <p
                    id="pw-err"
                    role="alert"
                    className="mt-1.5 text-sm text-red-600 flex items-center gap-1.5"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Password is required.
                  </p>
                )}
              </div>

              {/* Auth error — wrong credentials */}
              {authError && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {authError}
                </div>
              )}

              <Button type="submit" className="w-full" size="lg">
                Sign in
              </Button>
            </form>

            {/* Demo hint — always visible, never hidden */}
            <div className="mt-5 rounded-lg bg-stone-50 border border-stone-200 px-4 py-3">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                Demo credentials
              </p>
              <p className="text-xs text-stone-600 leading-relaxed font-mono">
                staff@university.edu / demo123
              </p>
              <p className="text-xs text-stone-500 leading-relaxed font-mono mt-0.5">
                advisor@university.edu / demo123
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Back to student view */}
        <p className="mt-5 text-center text-xs text-stone-400">
          Not a staff member?{" "}
          <button
            type="button"
            onClick={resetToIntake}
            className="text-teal-700 hover:text-teal-800 underline underline-offset-2 transition-colors"
          >
            Go to student intake
          </button>
        </p>

      </div>
    </div>
  );
}
