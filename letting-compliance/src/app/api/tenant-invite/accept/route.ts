/**
 * POST /api/tenant-invite/accept
 *
 * Called by the accept-invite page after the tenant has a valid session
 * (established by /auth/callback exchanging the Supabase PKCE code).
 *
 * Responsibilities:
 *   1. Validate the raw token from the URL against tenant_invites.token_hash
 *   2. Reject expired or already-used tokens
 *   3. Write auth_user_id on property_tenants (the permanent identity link)
 *   4. Mark the invite as accepted
 *
 * Email matching:
 *   tenant_invites.email is stored from property_tenants.lead_tenant_email at
 *   invite-creation time. Comparing user.email against invite.email is equivalent
 *   to comparing against lead_tenant_email.
 *
 * This route uses the admin client for all DB writes so it is not blocked
 * by RLS. The caller's identity comes from their Supabase session cookie,
 * verified via the server client.
 *
 * Body: { token: string }   (the raw hex token from the URL)
 */

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function POST(request: NextRequest) {
  // ── 1. Parse body ────────────────────────────────────────────────────────────
  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { token } = body;
  if (!token || typeof token !== "string" || token.length !== 64) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  // ── 2. Verify the caller has a session ───────────────────────────────────────
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "No active session. Please use the invite link again." },
      { status: 401 }
    );
  }

  // ── 3. Look up the invite by token hash ──────────────────────────────────────
  const tokenHash = hashToken(token);
  const admin = createAdminClient();

  const { data: invite, error: inviteError } = await admin
    .from("tenant_invites")
    .select("id, property_tenant_id, status, expires_at, email")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (inviteError || !invite) {
    return NextResponse.json(
      { error: "Invite not found. The link may be invalid." },
      { status: 404 }
    );
  }

  // ── 4. Verify the authenticated user's email matches the invite ──────────────
  // invite.email is sourced from property_tenants.lead_tenant_email at invite
  // creation time. Done before status checks so the safety-net write below can
  // also rely on the email being verified.
  if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json(
      { error: "This invite was sent to a different email address." },
      { status: 403 }
    );
  }

  // ── 5. Validate status and expiry ────────────────────────────────────────────
  if (invite.status === "accepted") {
    // Invite already consumed. Write auth_user_id defensively in case a prior
    // attempt validated the token and marked it accepted but failed before the
    // property_tenants update completed.
    console.log(`[accept-invite] alreadyAccepted — defensive auth_user_id write: propertyTenantId=${invite.property_tenant_id} authUserId=${user.id} leadTenantEmail=<redacted>`);
    await admin
      .from("property_tenants")
      .update({ auth_user_id: user.id })
      .eq("id", invite.property_tenant_id)
      .is("auth_user_id", null); // no-op if already set
    return NextResponse.json({ alreadyAccepted: true });
  }

  if (invite.status === "expired") {
    return NextResponse.json(
      { error: "This invite link has expired. Ask your letting agent to send a new one." },
      { status: 410 }
    );
  }

  if (new Date(invite.expires_at) < new Date()) {
    // Pending but past expiry window — expire it now and reject
    await admin
      .from("tenant_invites")
      .update({ status: "expired" })
      .eq("id", invite.id);

    return NextResponse.json(
      { error: "This invite link has expired. Ask your letting agent to send a new one." },
      { status: 410 }
    );
  }

  // ── 6. Write auth_user_id on property_tenants ────────────────────────────────
  console.log(`[accept-invite] linking: propertyTenantId=${invite.property_tenant_id} authUserId=${user.id} leadTenantEmail=<redacted>`);

  const { error: updateError } = await admin
    .from("property_tenants")
    .update({ auth_user_id: user.id })
    .eq("id", invite.property_tenant_id);

  if (updateError) {
    console.error(`[accept-invite] auth_user_id write failed: propertyTenantId=${invite.property_tenant_id} authUserId=${user.id} error=${updateError.message}`);
    return NextResponse.json(
      { error: "Failed to link your account. Please try again." },
      { status: 500 }
    );
  }
  console.log(`[accept-invite] auth_user_id write succeeded: propertyTenantId=${invite.property_tenant_id} authUserId=${user.id}`);

  // ── 7. Mark the invite as accepted ───────────────────────────────────────────
  await admin
    .from("tenant_invites")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invite.id);

  return NextResponse.json({ success: true });
}
