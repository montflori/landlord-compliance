"use client";

/**
 * /portal/accept-invite
 *
 * This page MUST live outside the (tenant) route group.
 * The (tenant)/layout.tsx auth guard redirects unauthenticated users;
 * here the session is established by /auth/callback just before this
 * page loads, so by the time the user arrives they have a valid session.
 *
 * Flow:
 *   1. /auth/callback exchanges the PKCE code → sets session cookies
 *   2. Redirects here with ?token=<rawToken>
 *   3. On mount, POST /api/tenant-invite/accept to validate token and
 *      write auth_user_id to property_tenants
 *   4. User sets a new password → redirected to /portal
 */

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Stage =
  | "validating"   // calling accept API
  | "set-password" // token valid, show password form
  | "saving"       // calling updateUser
  | "done"         // success, redirecting
  | "error";       // unrecoverable error

function AcceptInviteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [stage, setStage] = useState<Stage>("validating");
  const [errorMessage, setErrorMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // ── Step 1: Validate token on mount ─────────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setErrorMessage("No invite token found in the URL. Please use the link from your email.");
      setStage("error");
      return;
    }

    async function validateToken() {
      const res = await fetch("/api/tenant-invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error ?? "Something went wrong. Please try again.");
        setStage("error");
        return;
      }

      if (data.alreadyAccepted) {
        // Invite already consumed — portal is already accessible
        router.replace("/portal");
        return;
      }

      setStage("set-password");
    }

    validateToken();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step 2: Password form submit ─────────────────────────────────────────────
  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");

    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setStage("saving");

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setPasswordError(error.message);
      setStage("set-password");
      return;
    }

    setStage("done");
    // Short pause so the success state is visible before redirecting
    setTimeout(() => router.replace("/portal"), 1200);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-12">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white overflow-hidden border border-slate-200 shadow-sm">
          <img src="/let-lucid-logo.png" alt="Let Lucid" className="h-7 w-7 object-contain" />
        </div>
        <span
          style={{ fontFamily: "var(--font-bebas)" }}
          className="text-[22px] tracking-widest leading-none text-slate-900"
        >
          LET LUCID
        </span>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white px-8 py-10 shadow-sm">

        {/* Validating */}
        {stage === "validating" && (
          <div className="flex flex-col items-center py-4 text-center">
            <svg className="mb-4 h-6 w-6 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-slate-500">Verifying your invite…</p>
          </div>
        )}

        {/* Error */}
        {stage === "error" && (
          <div className="text-center">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <h1 className="text-base font-semibold text-slate-900">Invite link problem</h1>
            <p className="mt-2 text-sm text-slate-500">{errorMessage}</p>
            <p className="mt-4 text-xs text-slate-400">
              Contact your letting agent to request a new invite, or{" "}
              <Link href="/portal-login" className="text-indigo-600 hover:underline">
                sign in
              </Link>{" "}
              if you already have an account.
            </p>
          </div>
        )}

        {/* Set password */}
        {(stage === "set-password" || stage === "saving") && (
          <>
            <div className="mb-7 text-center">
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-slate-900">Set your password</h1>
              <p className="mt-1 text-sm text-slate-500">
                Choose a password to secure your tenant portal account.
              </p>
            </div>

            <form onSubmit={handleSetPassword} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Confirm password
                </label>
                <input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {passwordError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {passwordError}
                </div>
              )}

              <button
                type="submit"
                disabled={stage === "saving"}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {stage === "saving" ? "Setting password…" : "Set password and continue"}
              </button>
            </form>
          </>
        )}

        {/* Done */}
        {stage === "done" && (
          <div className="flex flex-col items-center py-4 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
              <svg className="h-6 w-6 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-slate-900">You&apos;re all set!</h2>
            <p className="mt-1 text-sm text-slate-500">Taking you to your portal…</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteInner />
    </Suspense>
  );
}
