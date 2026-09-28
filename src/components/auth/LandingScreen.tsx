import { useState } from "react";
import { AlertCircle, ArrowRight, KeyRound, Shield, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/lib/AppContext";
import { DEMO_CREDENTIALS } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LandingScreen() {
  const { login, loginAsGuest } = useApp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const emailEmpty = email.trim().length === 0;
  const emailInvalid = !emailEmpty && !EMAIL_RE.test(email.trim());
  const passwordEmpty = password.length === 0;
  const showEmailError = emailTouched && (emailEmpty || emailInvalid);
  const showPasswordError = passwordTouched && passwordEmpty;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailTouched(true);
    setPasswordTouched(true);
    setAuthError(null);
    if (emailEmpty || emailInvalid || passwordEmpty) return;
    const ok = login(email.trim(), password);
    if (!ok) setAuthError("Those credentials don't match. Check the hint below.");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: "#FAF8F5" }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-stone-900 tracking-tight">CampusReach</span>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 mb-1">
              <KeyRound className="w-4 h-4 text-teal-600" />
              <CardTitle className="text-base">Sign in</CardTitle>
            </div>
            <CardDescription>Students, staff, and admins share one sign-in.</CardDescription>
          </CardHeader>

          <CardContent className="pt-0">
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-stone-800 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@university.edu"
                  value={email}
                  error={showEmailError}
                  onChange={(e) => { setEmail(e.target.value); setAuthError(null); }}
                  onBlur={() => setEmailTouched(true)}
                />
                {showEmailError && (
                  <p role="alert" className="mt-1.5 text-sm text-red-600 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {emailEmpty ? "Email is required." : "Please enter a valid email address."}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-stone-800 mb-1.5">
                  Password <span className="text-red-500">*</span>
                </label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  error={showPasswordError}
                  onChange={(e) => { setPassword(e.target.value); setAuthError(null); }}
                  onBlur={() => setPasswordTouched(true)}
                />
                {showPasswordError && (
                  <p role="alert" className="mt-1.5 text-sm text-red-600 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Password is required.
                  </p>
                )}
              </div>

              {authError && (
                <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {authError}
                </div>
              )}

              <Button type="submit" className="w-full" size="lg">
                Sign in <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            {/* Guest path */}
            <div className="mt-4 pt-4 border-t border-stone-100 text-center">
              <p className="text-xs text-stone-400 mb-3">Just exploring? No account needed.</p>
              <Button variant="outline" className="w-full" onClick={loginAsGuest}>
                <UserCircle2 className="w-4 h-4" />
                Continue as guest
              </Button>
            </div>

            {/* Demo hint — always visible */}
            <div className="mt-5 rounded-lg bg-stone-50 border border-stone-200 px-4 py-3">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                Demo accounts
              </p>
              <div className="space-y-1.5">
                {DEMO_CREDENTIALS.map((c) => (
                  <button
                    key={c.email}
                    type="button"
                    onClick={() => { setEmail(c.email); setPassword(c.password); setAuthError(null); }}
                    className="w-full text-left flex items-center justify-between text-xs rounded px-2 py-1.5 hover:bg-stone-100 transition-colors group"
                  >
                    <span className="font-mono text-stone-600 group-hover:text-teal-700">{c.email}</span>
                    <span className="text-stone-400 bg-stone-200 group-hover:bg-teal-100 group-hover:text-teal-700 rounded px-1.5 py-0.5 capitalize">{c.role}</span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-stone-400 mt-2">Password for all: <span className="font-mono">demo123</span> · Click a row to fill in</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
