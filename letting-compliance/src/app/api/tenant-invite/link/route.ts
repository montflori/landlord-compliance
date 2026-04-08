/**
 * POST /api/tenant-invite/link
 *
 * Called after a tenant successfully sets their password (from either
 * /portal/accept-invite or /portal/reset-password). Ensures:
 *   1. property_tenants.auth_user_id is linked to the authenticated user.
 *   2. property_tenants.portal_activated_at is set to now(), recording that
 *      the tenant has completed portal account setup.
 *
 * Multiple-row handling:
 *   A tenant email can legitimately appear on more than one property_tenants
 *   row (e.g. successive tenancies at different properties). The route
 *   classifies each matching row and acts only when it is safe to do so:
 *
 *   - Conflict (row linked to a different user)  → reject 409
 *   - Multiple unlinked rows                     → reject 409 (ambiguous)
 *   - Exactly one unlinked row                   → write auth_user_id + portal_activated_at
 *   - All rows already linked to this user       → write portal_activated_at where null
 *
 * Uses the admin client for all writes so it is not blocked by RLS.
 * No request body required.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Row = { id: string; auth_user_id: string | null; portal_activated_at: string | null };

export async function POST(_request: NextRequest) {
  const tag = "[tenant-invite/link]";

  // ── 1. Verify session ────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "No active session." }, { status: 401 });
  }
  if (!user.email) {
    return NextResponse.json({ error: "Session has no email address." }, { status: 422 });
  }

  // ── 2. Fetch ALL property_tenants rows for this email ────────────────────────
  const admin = createAdminClient();

  const { data: rows, error: lookupError } = await admin
    .from("property_tenants")
    .select("id, auth_user_id, portal_activated_at")
    .eq("lead_tenant_email", user.email);

  if (lookupError) {
    console.error(`${tag} tenancy lookup failed: error=${lookupError.message}`);
    return NextResponse.json({ error: "Failed to look up tenancy." }, { status: 500 });
  }

  const matchCount = rows?.length ?? 0;
  console.log(`${tag} email lookup: matchCount=${matchCount} authUserId=${user.id}`);

  if (matchCount === 0) {
    console.log(`${tag} no tenancy found for session email — no action taken`);
    return NextResponse.json({ linked: false, activated: false, reason: "no_tenancy" });
  }

  // ── 3. Classify rows ─────────────────────────────────────────────────────────
  const alreadyMine: Row[] = [];
  const unlinked: Row[]    = [];
  const conflict: Row[]    = [];

  for (const row of rows as Row[]) {
    const existing = row.auth_user_id;
    if (existing === user.id)   alreadyMine.push(row);
    else if (existing === null) unlinked.push(row);
    else                        conflict.push(row);
  }

  console.log(`${tag} classification: alreadyMine=${alreadyMine.length} unlinked=${unlinked.length} conflict=${conflict.length}`);

  // ── 4. Conflict — row linked to a different user ─────────────────────────────
  if (conflict.length > 0) {
    console.error(`${tag} auth_user_id conflict on ${conflict.length} row(s): ids=${conflict.map(r => r.id).join(",")} session=${user.id}`);
    return NextResponse.json(
      { error: "One or more tenancy records are already linked to a different account." },
      { status: 409 }
    );
  }

  // ── 5. Multiple unlinked rows — ambiguous ────────────────────────────────────
  if (unlinked.length > 1) {
    console.error(`${tag} multiple unlinked rows (${unlinked.length}) — ambiguous: ids=${unlinked.map(r => r.id).join(",")}`);
    return NextResponse.json(
      { error: "Multiple unlinked tenancy records found for this email. Contact your letting agent." },
      { status: 409 }
    );
  }

  // ── 6. Exactly one unlinked row — write auth_user_id + portal_activated_at ───
  if (unlinked.length === 1) {
    const propertyTenantId = unlinked[0].id;
    console.log(`${tag} writing auth_user_id + portal_activated_at: propertyTenantId=${propertyTenantId} authUserId=${user.id}`);

    const now = new Date().toISOString();
    const { error: updateError } = await admin
      .from("property_tenants")
      .update({ auth_user_id: user.id, portal_activated_at: now })
      .eq("id", propertyTenantId)
      .is("auth_user_id", null); // guard: only write if still null

    if (updateError) {
      console.error(`${tag} write failed: propertyTenantId=${propertyTenantId} authUserId=${user.id} error=${updateError.message}`);
      return NextResponse.json({ error: "Failed to link account." }, { status: 500 });
    }

    console.log(`${tag} auth_user_id + portal_activated_at written: propertyTenantId=${propertyTenantId} authUserId=${user.id}`);
    return NextResponse.json({ linked: true, activated: true, propertyTenantId });
  }

  // ── 7. All rows already linked to this user — set portal_activated_at where null
  const needsActivation = alreadyMine.filter(r => r.portal_activated_at === null);

  if (needsActivation.length === 0) {
    const ids = alreadyMine.map(r => r.id).join(",");
    console.log(`${tag} all rows already linked and activated — no-op: ids=${ids}`);
    return NextResponse.json({ linked: false, activated: false, reason: "already_set" });
  }

  const activateIds = needsActivation.map(r => r.id);
  console.log(`${tag} setting portal_activated_at on ${activateIds.length} row(s): ids=${activateIds.join(",")} authUserId=${user.id}`);

  const now = new Date().toISOString();
  const { error: activateError } = await admin
    .from("property_tenants")
    .update({ portal_activated_at: now })
    .in("id", activateIds)
    .eq("auth_user_id", user.id) // extra guard: only rows already correctly linked
    .is("portal_activated_at", null);

  if (activateError) {
    console.error(`${tag} portal_activated_at write failed: ids=${activateIds.join(",")} error=${activateError.message}`);
    return NextResponse.json({ error: "Failed to activate portal." }, { status: 500 });
  }

  console.log(`${tag} portal_activated_at written: ids=${activateIds.join(",")} authUserId=${user.id}`);
  return NextResponse.json({ linked: false, activated: true, activatedCount: activateIds.length });
}
