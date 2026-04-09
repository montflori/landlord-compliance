/**
 * GET /api/document-requests/[id]/download
 *
 * Returns a short-lived signed URL for the tenant document uploaded against
 * a request. Called by the agent review panel.
 *
 * Uses the admin client so storage RLS (which scopes to the uploader) does
 * not block the agent from reading the file.
 *
 * Auth: caller must be the agent who owns the property on the request.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "tenant-uploads";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // ── 1. Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // ── 2. Fetch request + verify agent owns the property ────────────────────────
  const { data: req } = await admin
    .from("tenant_document_requests")
    .select("id, uploaded_document_id, property_id, properties(landlords(user_id))")
    .eq("id", id)
    .single();

  if (!req) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const prop = Array.isArray(req.properties) ? req.properties[0] : req.properties;
  const landlord = prop
    ? Array.isArray((prop as any).landlords) ? (prop as any).landlords[0] : (prop as any).landlords
    : null;

  if (landlord?.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!req.uploaded_document_id) {
    return NextResponse.json({ error: "No document uploaded yet" }, { status: 422 });
  }

  // ── 3. Get the file path from tenant_documents ───────────────────────────────
  const { data: doc } = await admin
    .from("tenant_documents")
    .select("file_path")
    .eq("id", req.uploaded_document_id)
    .single();

  if (!doc?.file_path) {
    return NextResponse.json({ error: "Document file not found" }, { status: 404 });
  }

  // ── 4. Generate signed URL (60 min) ──────────────────────────────────────────
  const { data: signed, error: signErr } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(doc.file_path, 3600);

  if (signErr || !signed?.signedUrl) {
    console.error("[document-requests/download] signed URL error:", signErr?.message);
    return NextResponse.json({ error: "Could not generate download link" }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl });
}
