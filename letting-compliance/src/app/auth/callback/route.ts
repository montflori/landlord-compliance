/**
 * GET /auth/callback
 *
 * PKCE code exchange handler for all Supabase auth flows that redirect
 * back to the app with a `code` parameter:
 *   - Tenant invite accept  (from generateLink type:'invite')
 *   - Password reset        (from resetPasswordForEmail)
 *
 * Flow:
 *   1. Supabase redirects here with ?code=<pkce_code>&next=<destination>
 *   2. We exchange the code for a session (sets auth cookies)
 *   3. We redirect to `next` (defaults to /portal if not provided)
 *
 * `next` is a relative path — absolute URLs are rejected to prevent
 * open redirect attacks.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  // `next` is a relative path passed through from the original redirectTo
  const next = searchParams.get("next") ?? "/portal";

  // Reject non-relative paths to prevent open redirect
  const safeNext = next.startsWith("/") ? next : "/portal";

  if (!code) {
    // No code — something went wrong with the Supabase flow
    return NextResponse.redirect(`${origin}/portal-login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession error:", error.message);
    return NextResponse.redirect(`${origin}/portal-login?error=code_exchange_failed`);
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
