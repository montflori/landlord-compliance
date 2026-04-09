"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TENANT_UPLOADS_BUCKET } from "@/lib/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

type TenantDocument = {
  id: string;
  title: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
};

type DocumentRequest = {
  id: string;
  document_type: string;
  title: string;
  description: string | null;
  is_required: boolean;
  due_date: string | null;
  status: "requested" | "uploaded" | "approved" | "rejected";
  rejection_reason: string | null;
};

type TenancyInfo = {
  id: string;
  property_id: string;
};

type Toast = { type: "success" | "error"; message: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mime: string | null) {
  if (!mime) return "📄";
  if (mime.startsWith("image/")) return "🖼";
  if (mime === "application/pdf") return "📋";
  return "📄";
}

// ─── Upload panel ─────────────────────────────────────────────────────────────

function UploadPanel({
  tenancy,
  onClose,
  onUploaded,
  request,
}: {
  tenancy: TenancyInfo;
  onClose: () => void;
  onUploaded: () => void;
  request?: DocumentRequest;
}) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(request?.title ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError("Please select a file."); return; }
    if (!title.trim()) { setError("Please enter a document title."); return; }
    setError("");
    setUploading(true);
    setProgress(20);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("You must be signed in."); setUploading(false); return; }

    // Upload to storage: tenant-uploads/{userId}/{timestamp}-{filename}
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${user.id}/${Date.now()}-${safeName}`;
    setProgress(40);

    const { error: uploadError } = await supabase.storage
      .from(TENANT_UPLOADS_BUCKET)
      .upload(filePath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      setProgress(0);
      return;
    }
    setProgress(75);

    // Insert DB record
    const { data: insertedDoc, error: dbError } = await supabase
      .from("tenant_documents")
      .insert({
        tenant_id: tenancy.id,
        property_id: tenancy.property_id,
        uploaded_by: user.id,
        title: title.trim(),
        file_name: file.name,
        file_path: filePath,
        file_size_bytes: file.size,
        mime_type: file.type || null,
        // Links this upload to the tenant_document_requests row.
        // The fulfill route also sets tenant_document_requests.uploaded_document_id.
        document_request_id: request?.id ?? null,
      })
      .select("id")
      .single();

    setProgress(100);

    if (dbError) {
      // Roll back storage upload if DB insert failed
      await supabase.storage.from(TENANT_UPLOADS_BUCKET).remove([filePath]);
      setError(dbError.message);
      setUploading(false);
      setProgress(0);
      return;
    }

    // If this upload is fulfilling a document request, mark it as uploaded.
    if (request?.id && insertedDoc?.id) {
      await fetch(`/api/document-requests/${request.id}/fulfill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: insertedDoc.id }),
      });
      // Non-fatal if this fails — the document is uploaded regardless.
    }

    setUploading(false);
    onUploaded();
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            {request ? `Upload: ${request.title}` : "Upload document"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex-1 space-y-5 px-5 py-5">
            {/* Title */}
            <div>
              <label htmlFor="doc-title" className="block text-sm font-medium text-slate-700 mb-1.5">
                Document title <span className="text-red-500">*</span>
              </label>
              <input
                id="doc-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Tenancy agreement, ID copy, Bank statement"
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* File picker */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                File <span className="text-red-500">*</span>
              </label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.heic"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
                id="file-input"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
                {file ? file.name : "Choose a file to upload"}
              </button>
              {file && (
                <p className="mt-1.5 text-xs text-slate-400">
                  {formatBytes(file.size)} · {file.type || "unknown type"}
                </p>
              )}
              <p className="mt-1.5 text-xs text-slate-400">
                PDF, JPG, PNG, DOC accepted · Max 20 MB
              </p>
            </div>

            {/* Progress bar */}
            {uploading && (
              <div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400">Uploading…</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 border-t border-slate-200 px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────

function DeleteModal({
  doc,
  onClose,
  onDeleted,
}: {
  doc: TenantDocument;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleDelete() {
    setLoading(true);
    setError("");

    // Remove from storage
    await supabase.storage.from(TENANT_UPLOADS_BUCKET).remove([doc.file_path]);

    // Delete DB record
    const { error: dbError } = await supabase
      .from("tenant_documents")
      .delete()
      .eq("id", doc.id);

    setLoading(false);
    if (dbError) { setError(dbError.message); return; }
    onDeleted();
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
          <h3 className="text-base font-semibold text-slate-900">Delete document?</h3>
          <p className="mt-2 text-sm text-slate-500">
            <strong className="text-slate-700">{doc.title}</strong> will be permanently deleted. This cannot be undone.
          </p>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-5 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
            >
              {loading ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TenantDocumentsPage() {
  const supabase = createClient();

  const [tenancy, setTenancy] = useState<TenancyInfo | null>(null);
  const [docs, setDocs] = useState<TenantDocument[]>([]);
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [activeRequest, setActiveRequest] = useState<DocumentRequest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TenantDocument | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Fetch tenancy + documents
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setFetchError("");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // auth_user_id first (post-accept), email fallback (pre-accept / legacy)
      const { data: byUserId } = await supabase
        .from("property_tenants")
        .select("id, property_id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      let tenancyData: TenancyInfo | null = byUserId ?? null;

      if (tenancyData) {
        console.log("[portal docs] tenancy lookup: auth_user_id");
      } else {
        console.log("[portal docs] tenancy lookup: email fallback");
        const { data: byEmail, error: emailError } = await supabase
          .from("property_tenants")
          .select("id, property_id")
          .eq("lead_tenant_email", user.email ?? "")
          .maybeSingle();
        if (emailError || !byEmail) {
          if (!cancelled) setFetchError("Could not load your tenancy details.");
          setLoading(false);
          return;
        }
        tenancyData = byEmail;
      }

      if (!cancelled) setTenancy(tenancyData);

      // Requests + documents in parallel
      const [docsResult, requestsResult] = await Promise.all([
        supabase
          .from("tenant_documents")
          .select("id, title, file_name, file_path, file_size_bytes, mime_type, created_at")
          .eq("tenant_id", tenancyData.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("tenant_document_requests")
          .select("id, document_type, title, description, is_required, due_date, status, rejection_reason")
          .eq("property_tenant_id", tenancyData.id)
          .order("created_at", { ascending: true }),
      ]);

      if (!cancelled) {
        if (docsResult.error) setFetchError(docsResult.error.message);
        else setDocs(docsResult.data ?? []);
        setRequests((requestsResult.data ?? []) as DocumentRequest[]);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleUploaded() {
    setToast({ type: "success", message: "Document uploaded successfully." });
    setRefreshKey((k) => k + 1);
  }

  function handleDeleted() {
    setToast({ type: "success", message: "Document deleted." });
    setRefreshKey((k) => k + 1);
  }

  async function handleDownload(doc: TenantDocument) {
    const { data, error } = await supabase.storage
      .from(TENANT_UPLOADS_BUCKET)
      .createSignedUrl(doc.file_path, 60);
    if (error || !data) return;
    window.open(data.signedUrl, "_blank");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">

      {/* ── Toast ────────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed right-4 top-16 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg sm:right-6 sm:top-20 ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {toast.type === "success" ? (
            <svg className="h-4 w-4 shrink-0 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="h-4 w-4 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
          )}
          <p className="text-sm font-medium">{toast.message}</p>
          <button onClick={() => setToast(null)} className="ml-1 rounded p-0.5 hover:opacity-70">
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Overlay panels ────────────────────────────────────────────────────── */}
      {showUpload && tenancy && (
        <UploadPanel
          tenancy={tenancy}
          onClose={() => { setShowUpload(false); setActiveRequest(null); }}
          onUploaded={handleUploaded}
          request={activeRequest ?? undefined}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          doc={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}

      {/* ── Page header ───────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Documents</h1>
          <p className="mt-1 text-sm text-slate-500">
            Upload and manage documents shared with your letting agent.
          </p>
        </div>
        <button
          onClick={() => { setActiveRequest(null); setShowUpload(true); }}
          disabled={!tenancy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
          </svg>
          <span className="hidden sm:inline">Upload document</span>
          <span className="sm:hidden">Upload</span>
        </button>
      </div>

      {/* ── Document requests ─────────────────────────────────────────────────── */}
      {!loading && requests.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Requested documents</h2>
          <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {requests.map((req) => {
              const isPending   = req.status === "requested";
              const isUploaded  = req.status === "uploaded";
              const isApproved  = req.status === "approved";
              const isRejected  = req.status === "rejected";
              return (
                <div key={req.id} className="flex items-start justify-between gap-4 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">{req.title}</p>
                      {req.is_required && (
                        <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 ring-1 ring-inset ring-red-500/20">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {req.document_type}
                      {req.due_date
                        ? ` · Due ${new Date(req.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                        : ""}
                    </p>
                    {req.description && (
                      <p className="mt-1 text-xs text-slate-500">{req.description}</p>
                    )}
                    {isRejected && req.rejection_reason && (
                      <p className="mt-1 text-xs text-red-600">
                        Rejected: {req.rejection_reason}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {isPending && (
                      <button
                        type="button"
                        onClick={() => { setActiveRequest(req); setShowUpload(true); }}
                        disabled={!tenancy}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                        </svg>
                        Upload
                      </button>
                    )}
                    {isRejected && (
                      <button
                        type="button"
                        onClick={() => { setActiveRequest(req); setShowUpload(true); }}
                        disabled={!tenancy}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                      >
                        Re-upload
                      </button>
                    )}
                    {isUploaded && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        Under review
                      </span>
                    )}
                    {isApproved && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Approved
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── My documents ─────────────────────────────────────────────────────── */}
      {!loading && (docs.length > 0 || requests.length === 0) && (
        <h2 className="mb-3 text-sm font-semibold text-slate-700">My documents</h2>
      )}

      {/* ── Content ───────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="h-6 w-6 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : fetchError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
          <p className="text-sm text-red-700">{fetchError}</p>
        </div>
      ) : docs.length === 0 ? (
        /* Empty state */
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <h3 className="mb-1 text-base font-semibold text-slate-900">No documents yet</h3>
          <p className="mx-auto mb-6 max-w-sm text-sm text-slate-500">
            Upload documents your letting agent has requested, such as your tenancy agreement, ID, or proof of income.
          </p>
          <button
            onClick={() => setShowUpload(true)}
            disabled={!tenancy}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            Upload your first document
          </button>
        </div>
      ) : (
        /* Document list */
        <div className="space-y-2">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300"
            >
              {/* File type icon */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg">
                {fileIcon(doc.mime_type)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{doc.title}</p>
                <p className="truncate text-xs text-slate-400">
                  {doc.file_name}
                  {doc.file_size_bytes ? ` · ${formatBytes(doc.file_size_bytes)}` : ""}
                  {" · "}
                  {formatDate(doc.created_at)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => handleDownload(doc)}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Download"
                  title="Download"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </button>
                <button
                  onClick={() => setDeleteTarget(doc)}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                  aria-label="Delete"
                  title="Delete"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Help note ──────────────────────────────────────────────────────────── */}
      {docs.length > 0 && (
        <p className="mt-6 text-center text-xs text-slate-400">
          Documents are only visible to you and your letting agent.
        </p>
      )}
    </div>
  );
}
