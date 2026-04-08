/**
 * Tenant invite API
 *
 * GET  /api/tenant-invite?propertyTenantId=<id>
 *   Returns the most recent invite row for a tenancy (status, expiry).
 *   Only callable by an authenticated agent who owns the property.
 *
 * POST /api/tenant-invite
 *   Body: { propertyTenantId: string }
 *   Sends (or resends) a portal invite to the tenant email on the tenancy.
 *
 *   Two paths depending on whether the tenant already has a linked auth account:
 *
 *   A) auth_user_id IS NULL (not yet linked):
 *      - Tries type:'invite' to create the auth user.
 *      - Falls back to type:'magiclink' if the email is already registered.
 *      - Both redirect to /portal/accept-invite which writes auth_user_id.
 *      - An invite row is inserted so the token can be validated.
 *
 *   B) auth_user_id IS SET (already linked):
 *      - Sends a type:'recovery' link → /portal/reset-password.
 *      - No invite row is inserted (auth_user_id is already correct).
 *      - Old pending invite rows are still expired for cleanliness.
 *
 * Token security (path A only):
 *   Raw token (32 random bytes, hex) is sent in the email URL.
 *   SHA-256 hash is stored in tenant_invites.token_hash.
 *   The DB never holds the recoverable token.
 */

import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTenantInviteEmail } from "@/lib/tenant-invite-email";

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function buildAppUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}${path}`;
}

// ── GET — invite status ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const propertyTenantId = request.nextUrl.searchParams.get("propertyTenantId");
  if (!propertyTenantId) {
    return NextResponse.json({ error: "Missing propertyTenantId" }, { status: 400 });
  }

  // Authenticate the caller
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── Temporary: env var presence check (booleans only, no secret values) ──────
  console.log("[tenant-invite GET] env check", {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasResendKey: !!process.env.RESEND_API_KEY,
    hasReminderFromEmail: !!process.env.REMINDER_FROM_EMAIL,
  });

  const admin = createAdminClient();

  // Verify the agent owns the property this tenancy belongs to
  const owned = await agentOwnsTenancy(admin, propertyTenantId, user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Return the most recent invite row (any status)
  const { data: invite } = await admin
    .from("tenant_invites")
    .select("id, status, created_at, expires_at, accepted_at")
    .eq("property_tenant_id", propertyTenantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ invite: invite ?? null });
}

// ── POST — send / resend invite ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const tag = "[tenant-invite POST]";
  try {
    return await postHandler(request, tag);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${tag} unhandled exception:`, msg);
    return NextResponse.json({ error: `Unexpected server error: ${msg}` }, { status: 500 });
  }
}

async function postHandler(request: NextRequest, tag: string): Promise<Response> {
  let body: { propertyTenantId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { propertyTenantId } = body;
  if (!propertyTenantId) {
    return NextResponse.json({ error: "Missing propertyTenantId" }, { status: 400 });
  }

  // Authenticate the caller
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) {
    console.error(`${tag} auth failed:`, authError?.message ?? "no session");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  console.log(`${tag} caller user_id=${user.id} propertyTenantId=${propertyTenantId}`);

  // ── Temporary: env var presence check (booleans only, no secret values) ──────
  console.log(`${tag} env check`, {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasResendKey: !!process.env.RESEND_API_KEY,
    hasReminderFromEmail: !!process.env.REMINDER_FROM_EMAIL,
  });

  const admin = createAdminClient();

  // ── Step 1: Fetch tenancy + ownership check ──────────────────────────────────
  const { data: tenancy, error: tenancyError } = await admin
    .from("property_tenants")
    .select(`
      id,
      lead_tenant_name,
      lead_tenant_email,
      auth_user_id,
      property_id,
      properties (
        address_line_1,
        address_line_2,
        city,
        postcode,
        landlords ( user_id, full_name )
      )
    `)
    .eq("id", propertyTenantId)
    .single();

  if (tenancyError || !tenancy) {
    console.error(`${tag} step1 tenancy lookup failed: propertyTenantId=${propertyTenantId} error=${tenancyError?.message ?? "no row"}`);
    return NextResponse.json({ error: "Tenancy not found" }, { status: 404 });
  }
  console.log(`${tag} step1 tenancy found: property_id=${tenancy.property_id} hasAuthUserId=${!!(tenancy as any).auth_user_id}`);

  const prop = Array.isArray(tenancy.properties) ? tenancy.properties[0] : tenancy.properties;
  const landlord = prop
    ? Array.isArray((prop as any).landlords)
      ? (prop as any).landlords[0]
      : (prop as any).landlords
    : null;

  if (!landlord || landlord.user_id !== user.id) {
    console.error(`${tag} step1 ownership check failed: landlord.user_id=${landlord?.user_id ?? "null"} caller=${user.id}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  console.log(`${tag} step1 ownership check passed`);

  // ── Step 2: Validate tenant email ────────────────────────────────────────────
  const tenantEmail = tenancy.lead_tenant_email;
  if (!tenantEmail) {
    console.error(`${tag} step2 no tenant email on propertyTenantId=${propertyTenantId}`);
    return NextResponse.json(
      { error: "This tenancy has no email address. Add one before sending an invite." },
      { status: 422 }
    );
  }
  console.log(`${tag} step2 tenant email present`);

  // ── Step 3: Expire any existing pending invite ───────────────────────────────
  const { error: expireError, count: expireCount } = await admin
    .from("tenant_invites")
    .update({ status: "expired" })
    .eq("property_tenant_id", propertyTenantId)
    .eq("status", "pending");

  if (expireError) {
    console.error(`${tag} step3 expire pending invite failed: ${expireError.message}`);
    return NextResponse.json(
      { error: `Failed to expire previous invite: ${expireError.message}` },
      { status: 500 }
    );
  }
  console.log(`${tag} step3 expired ${expireCount ?? 0} pending invite(s)`);

  // ── Step 4: Branch on whether the tenant's auth account is already linked ────
  const authUserId = (tenancy as any).auth_user_id as string | null;
  const address = [
    (prop as any).address_line_1,
    (prop as any).address_line_2,
    (prop as any).city,
    (prop as any).postcode,
  ]
    .filter(Boolean)
    .join(", ");

  if (authUserId) {
    // Path B: tenant already has a linked account — send a password-reset link
    // so they can regain access without disturbing their account or any data.
    console.log(`${tag} step4 tenant already linked — sending recovery link`);

    const recoveryRedirectTo = buildAppUrl(
      `/auth/callback?next=${encodeURIComponent("/portal/reset-password")}`
    );

    const { data: recoveryData, error: recoveryError } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: tenantEmail,
      options: { redirectTo: recoveryRedirectTo },
    });

    if (recoveryError || !recoveryData?.properties?.action_link) {
      console.error(`${tag} step4 recovery generateLink failed: ${recoveryError?.message ?? "no action_link"}`);
      return NextResponse.json(
        { error: `Failed to generate recovery link: ${recoveryError?.message ?? "no action_link returned"}` },
        { status: 500 }
      );
    }
    console.log(`${tag} step4 recovery link generated`);

    console.log(`${tag} step5 sending recovery email to=<redacted>`);
    try {
      await sendTenantInviteEmail({
        to: tenantEmail,
        tenantName: tenancy.lead_tenant_name,
        propertyAddress: address,
        agentName: landlord.full_name ?? "Your letting agent",
        actionLink: recoveryData.properties.action_link,
      });
    } catch (emailError) {
      const msg = emailError instanceof Error ? emailError.message : String(emailError);
      console.error(`${tag} step5 recovery email send failed: ${msg}`);
      return NextResponse.json(
        { error: `Recovery email failed to send: ${msg}. Please resend.` },
        { status: 500 }
      );
    }
    console.log(`${tag} step5 recovery email sent`);
    return NextResponse.json({ success: true });
  }

  // Path A: tenant does not yet have a linked auth account
  // ── Step 4A: Generate invite or magic link ───────────────────────────────────
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const acceptPath = `/portal/accept-invite?token=${rawToken}`;
  const redirectTo = buildAppUrl(
    `/auth/callback?next=${encodeURIComponent(acceptPath)}`
  );

  // Try 'invite' first (creates the auth user if they don't exist).
  // If the user already exists, Supabase rejects 'invite' — fall back to
  // 'magiclink' so the existing user gets a one-time sign-in link that
  // still flows through /auth/callback → /portal/accept-invite.
  console.log(`${tag} step4A calling generateLink(invite) for email=<redacted> redirectTo=${redirectTo}`);
  let { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "invite",
    email: tenantEmail,
    options: { redirectTo },
  });

  if (linkError && /already registered/i.test(linkError.message ?? "")) {
    console.log(`${tag} step4A user already exists in auth — falling back to magiclink`);
    ({ data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: tenantEmail,
      options: { redirectTo },
    }));
  }

  if (linkError || !linkData?.properties?.action_link) {
    console.error(`${tag} step4A generateLink failed: ${linkError?.message ?? "no action_link in response"}`);
    console.error(`${tag} step4A generateLink full error:`, JSON.stringify(linkError ?? {}));
    return NextResponse.json(
      { error: `Failed to generate invite link: ${linkError?.message ?? "no action_link returned"}` },
      { status: 500 }
    );
  }
  console.log(`${tag} step4A generateLink succeeded`);

  // ── Step 5A: Persist the invite row ─────────────────────────────────────────
  const { error: insertError } = await admin.from("tenant_invites").insert({
    property_tenant_id: propertyTenantId,
    email: tenantEmail,
    token_hash: tokenHash,
    invited_by_user_id: user.id,
    // expires_at uses the DB default: now() + interval '7 days'
  });

  if (insertError) {
    console.error(`${tag} step5A insert tenant_invites failed: ${insertError.message} code=${insertError.code}`);
    return NextResponse.json(
      { error: `Failed to record invite: ${insertError.message}` },
      { status: 500 }
    );
  }
  console.log(`${tag} step5A tenant_invites row inserted`);

  // ── Step 6A: Send invite email ───────────────────────────────────────────────
  console.log(`${tag} step6A sending invite email to=<redacted>`);
  try {
    await sendTenantInviteEmail({
      to: tenantEmail,
      tenantName: tenancy.lead_tenant_name,
      propertyAddress: address,
      agentName: landlord.full_name ?? "Your letting agent",
      actionLink: linkData.properties.action_link,
    });
  } catch (emailError) {
    // Invite row was inserted — log failure but let agent resend.
    const msg = emailError instanceof Error ? emailError.message : String(emailError);
    console.error(`${tag} step6A email send failed: ${msg}`);
    return NextResponse.json(
      { error: `Invite created but email failed to send: ${msg}. Please resend.` },
      { status: 500 }
    );
  }
  console.log(`${tag} step6A invite email sent`);

  return NextResponse.json({ success: true });
}

// ── Helper ────────────────────────────────────────────────────────────────────

async function agentOwnsTenancy(
  admin: ReturnType<typeof createAdminClient>,
  propertyTenantId: string,
  userId: string
): Promise<boolean> {
  const { data } = await admin
    .from("property_tenants")
    .select("properties(landlords(user_id))")
    .eq("id", propertyTenantId)
    .single();

  if (!data) return false;
  const prop = Array.isArray((data as any).properties)
    ? (data as any).properties[0]
    : (data as any).properties;
  const landlord = prop
    ? Array.isArray(prop.landlords) ? prop.landlords[0] : prop.landlords
    : null;
  return landlord?.user_id === userId;
}
