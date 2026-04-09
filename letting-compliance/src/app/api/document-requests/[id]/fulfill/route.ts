/**
 * POST /api/document-requests/[id]/fulfill
 *
 * Called by the tenant after successfully uploading a document.
 * Links the uploaded tenant_documents row to the request and sets
 * status = 'uploaded'.
 *
 * Body: { documentId: string }
 *
 * Security:
 *   - Caller must be authenticated.
 *   - Request's property_tenant_id must match the caller's property_tenants row
 *     (matched by auth_user_id).
 *   - Document's uploaded_by_user_id must match the caller.
 *   - Request must be in 'requested' status (idempotent if already 'uploaded'
 *     with the same document id).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: requestId } = await params;
  const tag = `[document-requests/${requestId}/fulfill]`;

  // ── 1. Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── 2. Parse body ────────────────────────────────────────────────────────────
  let body: { documentId?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { documentId } = body;
  if (!documentId) {
    return NextResponse.json({ error: "Missing documentId" }, { status: 400 });
  }

  const admin = createAdminClient();

  // ── 3. Fetch the request ─────────────────────────────────────────────────────
  const { data: docReq } = await admin
    .from("tenant_document_requests")
    .select("id, property_tenant_id, status, uploaded_document_id")
    .eq("id", requestId)
    .single();

  if (!docReq) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  // ── 4. Verify the tenant owns the request ────────────────────────────────────
  const { data: tenancy } = await admin
    .from("property_tenants")
    .select("id")
    .eq("id", docReq.property_tenant_id)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!tenancy) {
    console.error(`${tag} ownership check failed: property_tenant_id=${docReq.property_tenant_id} caller=${user.id}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── 5. Idempotency: already fulfilled with this document ─────────────────────
  if (docReq.status === "uploaded" && docReq.uploaded_document_id === documentId) {
    console.log(`${tag} already fulfilled with same document — no-op`);
    return NextResponse.json({ fulfilled: false, reason: "already_fulfilled" });
  }

  if (!["requested", "rejected"].includes(docReq.status)) {
    // approved — don't allow re-upload
    return NextResponse.json(
      { error: "This request has already been approved." },
      { status: 409 }
    );
  }

  // ── 6. Verify the document was uploaded by this user ─────────────────────────
  const { data: doc } = await admin
    .from("tenant_documents")
    .select("id, uploaded_by_user_id")
    .eq("id", documentId)
    .single();

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  if (doc.uploaded_by_user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── 7. Update the request ────────────────────────────────────────────────────
  console.log(`${tag} fulfilling: requestId=${requestId} documentId=${documentId} tenantId=${user.id}`);

  const { error: updateError } = await admin
    .from("tenant_document_requests")
    .update({ status: "uploaded", uploaded_document_id: documentId, rejection_reason: null })
    .eq("id", requestId);

  if (updateError) {
    console.error(`${tag} update failed: ${updateError.message}`);
    return NextResponse.json({ error: "Failed to update request." }, { status: 500 });
  }

  console.log(`${tag} fulfilled: requestId=${requestId} documentId=${documentId}`);
  return NextResponse.json({ fulfilled: true });
}
