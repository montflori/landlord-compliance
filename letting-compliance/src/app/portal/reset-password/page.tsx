"use client";

/**
 * /portal/reset-password
 *
 * Handles the Supabase password-reset callback for tenants.
 *
 * Flow:
 *   1. Tenant clicks "Forgot password?" on /portal-login
 *   2. supabase.auth.resetPasswordForEmail(email, { redirectTo: '/auth/callback?next=/portal/reset-password' })
 *   3. /auth/callback exchanges the PKCE code → session cookies set
 *   4. Redirects here — session is already active
 *   5. User enters and confirms new password → supabase.auth.updateUser({ password })
 *   6. Redirect to /portal
 *
 * This page also lives outside the (tenant) route group to avoid the
 * layout guard interfering with the passwordless session state.
 */

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // Backfill auth_user_id on property_tenants if it is not yet set.
    // This covers tenants who arrived via a recovery link rather than the
    // accept-invite token flow, where auth_user_id would not have been written.
    // Fire-and-forget: a failure here does not block portal access.
    fetch("/api/tenant-invite/link", { method: "POST" }).catch(() => {
      // Non-critical — portal lookup has an email fallback.
    });

    setDone(true);
    setTimeout(() => router.replace("/portal"), 1500);
  }

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
        {done ? (
          <div className="flex flex-col items-center py-4 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
              <svg className="h-6 w-6 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-slate-900">Password updated</h2>
            <p className="mt-1 text-sm text-slate-500">Taking you to your portal…</p>
          </div>
        ) : (
          <>
            <div className="mb-7 text-center">
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-slate-900">Set a new password</h1>
              <p className="mt-1 text-sm text-slate-500">
                Enter a new password for your portal account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  New password
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

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Updating password…" : "Update password"}
              </button>
            </form>

            <p className="mt-5 text-center text-xs text-slate-400">
              Remembered it?{" "}
              <Link href="/portal-login" className="text-indigo-600 hover:underline">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
