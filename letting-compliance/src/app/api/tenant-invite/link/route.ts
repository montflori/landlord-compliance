/**
 * POST /api/tenant-invite/link
 *
 * Backfills property_tenants.auth_user_id for the authenticated tenant.
 * Called after a successful password update on /portal/reset-password to
 * ensure the auth identity is linked even when the tenant arrived via a
 * recovery link rather than the accept-invite token flow.
 *
 * Multiple-row handling:
 *   A tenant email can legitimately appear on more than one property_tenants
 *   row (e.g. successive tenancies at different properties). The route
 *   classifies each matching row and acts only when it is safe to do so:
 *
 *   - All already linked to this user     → no-op (idempotent)
 *   - Exactly one unlinked (null) row     → write auth_user_id to that row
 *   - Multiple unlinked rows              → reject 409 (ambiguous)
 *   - Any row linked to a different user  → reject 409 (conflict)
 *
 * Uses the admin client for the update so it is not blocked by RLS.
 * No body required.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    .select("id, auth_user_id")
    .eq("lead_tenant_email", user.email);

  if (lookupError) {
    console.error(`${tag} tenancy lookup failed: error=${lookupError.message}`);
    return NextResponse.json({ error: "Failed to look up tenancy." }, { status: 500 });
  }

  const matchCount = rows?.length ?? 0;
  console.log(`${tag} email lookup: matchCount=${matchCount} authUserId=${user.id}`);

  if (matchCount === 0) {
    console.log(`${tag} no tenancy found for session email — no action taken`);
    return NextResponse.json({ linked: false, reason: "no_tenancy" });
  }

  // ── 3. Classify rows ─────────────────────────────────────────────────────────
  const alreadyMine: string[]  = [];   // auth_user_id === user.id
  const unlinked: string[]     = [];   // auth_user_id IS NULL
  const conflict: string[]     = [];   // auth_user_id set to a different user

  for (const row of rows!) {
    const existing = row.auth_user_id as string | null;
    if (existing === user.id)   alreadyMine.push(row.id);
    else if (existing === null) unlinked.push(row.id);
    else                        conflict.push(row.id);
  }

  console.log(`${tag} classification: alreadyMine=${alreadyMine.length} unlinked=${unlinked.length} conflict=${conflict.length}`);

  // ── 4. Conflict — some rows are linked to a different user ───────────────────
  if (conflict.length > 0) {
    console.error(`${tag} auth_user_id conflict on ${conflict.length} row(s): ids=${conflict.join(",")} session=${user.id}`);
    return NextResponse.json(
      { error: "One or more tenancy records are already linked to a different account." },
      { status: 409 }
    );
  }

  // ── 5. All already linked to this user — idempotent no-op ────────────────────
  if (unlinked.length === 0) {
    console.log(`${tag} all rows already linked to this user — no-op: ids=${alreadyMine.join(",")}`);
    return NextResponse.json({ linked: false, reason: "already_set" });
  }

  // ── 6. Multiple unlinked rows — ambiguous, cannot safely choose ──────────────
  if (unlinked.length > 1) {
    console.error(`${tag} multiple unlinked rows (${unlinked.length}) — ambiguous, refusing to link: ids=${unlinked.join(",")}`);
    return NextResponse.json(
      { error: "Multiple unlinked tenancy records found for this email. Contact your letting agent." },
      { status: 409 }
    );
  }

  // ── 7. Exactly one unlinked row — write auth_user_id ────────────────────────
  const propertyTenantId = unlinked[0];
  console.log(`${tag} writing auth_user_id: propertyTenantId=${propertyTenantId} authUserId=${user.id}`);

  const { error: updateError } = await admin
    .from("property_tenants")
    .update({ auth_user_id: user.id })
    .eq("id", propertyTenantId)
    .is("auth_user_id", null); // guard: only write if still null

  if (updateError) {
    console.error(`${tag} auth_user_id write failed: propertyTenantId=${propertyTenantId} authUserId=${user.id} error=${updateError.message}`);
    return NextResponse.json({ error: "Failed to link account." }, { status: 500 });
  }

  console.log(`${tag} auth_user_id write succeeded: propertyTenantId=${propertyTenantId} authUserId=${user.id}`);
  return NextResponse.json({ linked: true, propertyTenantId });
}
