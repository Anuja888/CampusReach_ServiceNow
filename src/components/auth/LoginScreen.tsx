/**
 * LoginScreen — the app's entry point for all roles.
 * Split layout: left brand panel + right form card.
 * NO demo credentials rendered anywhere in this file.
 */

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Eye, EyeOff, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/AppContext";
import {
  getLockoutStatus,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATION_MS,
} from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Registration sub-form ──────────────────────────────────────────────────────

function RegisterForm({ onBack }: { onBack: () => void }) {
  const { register } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const nameErr  = touched && !name.trim() ? "Name is required." : null;
  const emailErr = touched && !EMAIL_RE.test(email.trim()) ? "Enter a valid email." : null;
  const pwErr    = touched && pw.length < 8 ? "Password must be at least 8 characters." : null;
  const pw2Err   = touched && pw !== pw2 ? "Passwords do not match." : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError(null);
    if (nameErr || emailErr || pwErr || pw2Err) return;
    setBusy(true);
    const result = await register({ name: name.trim(), email: email.trim(), password: pw });
    setBusy(false);
    if (!result.ok) setError(result.error ?? "Registration failed.");
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label htmlFor="reg-name" className="block text-sm font-medium text-stone-800 mb-1.5">
          Full name <span className="text-red-500">*</span>
        </label>
        <Input
          id="reg-name"
          autoFocus
          autoComplete="name"
          placeholder="Your name"
          value={name}
          error={!!nameErr}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched(true)}
        />
        {nameErr && <FieldError msg={nameErr} />}
      </div>

      <div>
        <label htmlFor="reg-email" className="block text-sm font-medium text-stone-800 mb-1.5">
          Email <span className="text-red-500">*</span>
        </label>
        <Input
          id="reg-email"
          type="email"
          autoComplete="email"
          placeholder="you@university.edu"
          value={email}
          error={!!emailErr}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched(true)}
        />
        {emailErr && <FieldError msg={emailErr} />}
      </div>

      <div>
        <label htmlFor="reg-pw" className="block text-sm font-medium text-stone-800 mb-1.5">
          Password <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Input
            id="reg-pw"
            type={showPw ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Min. 8 characters"
            value={pw}
            error={!!pwErr}
            onChange={(e) => setPw(e.target.value)}
            onBlur={() => setTouched(true)}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPw((x) => !x)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            aria-label={showPw ? "Hide password" : "Show password"}
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {pwErr && <FieldError msg={pwErr} />}
      </div>

      <div>
        <label htmlFor="reg-pw2" className="block text-sm font-medium text-stone-800 mb-1.5">
          Confirm password <span className="text-red-500">*</span>
        </label>
        <Input
          id="reg-pw2"
          type={showPw ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Re-enter password"
          value={pw2}
          error={!!pw2Err}
          onChange={(e) => setPw2(e.target.value)}
          onBlur={() => setTouched(true)}
        />
        {pw2Err && <FieldError msg={pw2Err} />}
      </div>

      {error && (
        <div role="alert" aria-live="assertive" className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={busy}>
        {busy ? "Creating account…" : "Create account"}
      </Button>

      <button type="button" onClick={onBack} className="w-full text-sm text-stone-500 hover:text-stone-700 transition-colors text-center pt-1">
        ← Back to sign in
      </button>
    </form>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function FieldError({ msg }: { msg: string }) {
  return (
    <p role="alert" className="mt-1.5 text-sm text-red-600 flex items-center gap-1.5">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />{msg}
    </p>
  );
}

// ── Main LoginScreen ──────────────────────────────────────────────────────────

export function LoginScreen() {
  const { login, loginAsGuest, goToCrisisResources } = useApp();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [pwTouched, setPwTouched] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);

  const emailRef = useRef<HTMLInputElement>(null);

  // Autofocus email on mount
  useEffect(() => { emailRef.current?.focus(); }, []);

  // Lockout countdown ticker
  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, lockedUntil - Date.now());
      setLockCountdown(Math.ceil(remaining / 1000));
      if (remaining <= 0) {
        setLockedUntil(null);
        setLockCountdown(0);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  // Check existing lockout on email change
  useEffect(() => {
    if (!email) return;
    const { locked, remainingMs } = getLockoutStatus(email);
    if (locked) {
      setLockedUntil(Date.now() + remainingMs);
    } else {
      setLockedUntil(null);
    }
  }, [email]);

  const emailEmpty   = email.trim().length === 0;
  const emailInvalid = !emailEmpty && !EMAIL_RE.test(email.trim());
  const pwEmpty      = password.length === 0;

  const showEmailErr = emailTouched && (emailEmpty || emailInvalid);
  const showPwErr    = pwTouched && pwEmpty;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailTouched(true);
    setPwTouched(true);
    setAuthError(null);

    if (emailEmpty || emailInvalid || pwEmpty) return;

    // Check lockout
    const lockStatus = getLockoutStatus(email);
    if (lockStatus.locked) {
      setLockedUntil(Date.now() + lockStatus.remainingMs);
      return;
    }

    setBusy(true);
    const ok = await login(email.trim(), password);
    setBusy(false);

    if (!ok) {
      setAuthError("Email or password is incorrect.");
    }
  }

  const isLocked = !!lockedUntil && lockCountdown > 0;

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#FAF8F5" }}>

      {/* ── Left brand panel (hides on mobile) ── */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col justify-between bg-teal-700 px-12 py-16 text-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">CampusReach</span>
        </div>

        <div className="space-y-6 max-w-sm">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest bg-white/15 rounded-full px-3 py-1 mb-6">
              No Wrong Door
            </span>
            <h1 className="text-4xl font-bold leading-tight mb-4">
              You don't need to know who to talk to.
            </h1>
            <p className="text-white/80 text-lg leading-relaxed">
              Tell us what's going on. We'll figure out the right support and make sure you only have to say it once.
            </p>
          </div>

          <div className="space-y-3 text-sm text-white/70">
            <div className="flex items-start gap-2">
              <span className="text-teal-300 font-bold mt-0.5">✓</span>
              <span>Your message stays within the university support team</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-teal-300 font-bold mt-0.5">✓</span>
              <span>You choose exactly what gets forwarded before anything is sent</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-teal-300 font-bold mt-0.5">✓</span>
              <span>Crisis help is always available — no sign-in required</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-white/40">
          CampusReach helps you find support. Not a medical service or emergency responder.
        </p>
      </div>

      {/* ── Mobile compact header ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-10 bg-teal-700 px-4 py-3 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-md bg-white/20 flex items-center justify-center">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-white tracking-tight">CampusReach</span>
        <span className="ml-1 text-[10px] font-semibold text-teal-200 bg-white/15 rounded-full px-2 py-0.5">No Wrong Door</span>
      </div>

      {/* ── Right: form panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-20 lg:py-0">
        <div className="w-full max-w-sm">

          {mode === "register" ? (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Create a student account</CardTitle>
                <CardDescription>Staff and admin accounts are created by the university.</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <RegisterForm onBack={() => { setMode("login"); setAuthError(null); }} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Sign in to CampusReach</CardTitle>
                <CardDescription>Students, staff, and admins all use the same sign-in.</CardDescription>
              </CardHeader>

              <CardContent className="pt-0">
                <form onSubmit={handleSubmit} noValidate className="space-y-4">

                  {/* Email */}
                  <div>
                    <label htmlFor="login-email" className="block text-sm font-medium text-stone-800 mb-1.5">
                      Email <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <Input
                      id="login-email"
                      ref={emailRef}
                      type="email"
                      autoComplete="email"
                      placeholder="you@university.edu"
                      value={email}
                      error={showEmailErr}
                      onChange={(e) => { setEmail(e.target.value); setAuthError(null); }}
                      onBlur={() => setEmailTouched(true)}
                      aria-describedby={showEmailErr ? "email-err" : undefined}
                      disabled={isLocked}
                    />
                    {showEmailErr && (
                      <p id="email-err" role="alert" aria-live="polite" className="mt-1.5 text-sm text-red-600 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {emailEmpty ? "Email is required." : "Please enter a valid email."}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="login-pw" className="block text-sm font-medium text-stone-800 mb-1.5">
                      Password <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        id="login-pw"
                        type={showPw ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        error={showPwErr}
                        onChange={(e) => { setPassword(e.target.value); setAuthError(null); }}
                        onBlur={() => setPwTouched(true)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(e as unknown as React.FormEvent); }}
                        disabled={isLocked}
                        aria-describedby={showPwErr ? "pw-err" : undefined}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((x) => !x)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                        aria-label={showPw ? "Hide password" : "Show password"}
                        tabIndex={-1}
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {showPwErr && (
                      <p id="pw-err" role="alert" aria-live="polite" className="mt-1.5 text-sm text-red-600 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        Password is required.
                      </p>
                    )}
                  </div>

                  {/* Auth error */}
                  {authError && !isLocked && (
                    <div role="alert" aria-live="assertive" className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      {authError}
                    </div>
                  )}

                  {/* Lockout */}
                  {isLocked && (
                    <div role="alert" aria-live="polite" className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 text-center">
                      Too many attempts. Try again in{" "}
                      <span className="font-bold tabular-nums">{lockCountdown}s</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={busy || isLocked}
                  >
                    {busy ? "Signing in…" : "Sign in"}
                  </Button>
                </form>

                {/* Secondary links */}
                <div className="mt-5 pt-4 border-t border-stone-100 space-y-2 text-center">
                  <button
                    type="button"
                    onClick={() => { setMode("register"); setAuthError(null); }}
                    className="block w-full text-sm text-teal-700 hover:text-teal-900 transition-colors"
                  >
                    New student? Create an account
                  </button>
                  <button
                    type="button"
                    onClick={goToCrisisResources}
                    className="block w-full text-sm text-amber-700 hover:text-amber-900 transition-colors"
                  >
                    Need urgent help now?
                  </button>
                  <button
                    type="button"
                    onClick={loginAsGuest}
                    className="block w-full text-xs text-stone-400 hover:text-stone-600 transition-colors pt-1"
                  >
                    Continue without signing in
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          <p className="mt-5 text-center text-xs text-stone-300">
            CampusReach helps you find support. It is not a medical diagnosis or an emergency service.
          </p>
        </div>
      </div>
    </div>
  );
}
