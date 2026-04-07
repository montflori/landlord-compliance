"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type Property = {
  id: string;
  address_line_1: string;
  city: string;
  postcode: string;
};

type ComplianceType = {
  id: string;
  code: string;
  name: string;
};

type ComplianceRecord = {
  id: string;
  property_id: string;
  compliance_type_id: string;
  issue_date: string | null;
  expiry_date: string | null;
  notes: string | null;
  document_url: string | null;
};

// One row in the summary table — a required compliance type + its record (if any)
type ComplianceRow = {
  complianceType: ComplianceType;
  record: ComplianceRecord | null;
};

type Toast = { type: "success" | "error"; message: string };

type ComputedStatus = "valid" | "expiring_soon" | "expired" | "missing";

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_BUCKET = "compliance-documents";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-xs transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

const STATUS_ORDER: Record<ComputedStatus, number> = {
  expired: 0,
  expiring_soon: 1,
  missing: 2,
  valid: 3,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeStatus(record: ComplianceRecord | null): ComputedStatus {
  if (!record) return "missing";
  if (!record.expiry_date) return "valid";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(record.expiry_date);
  if (expiry < today) return "expired";
  const in30 = new Date(today);
  in30.setDate(today.getDate() + 30);
  if (expiry <= in30) return "expiring_soon";
  return "valid";
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}


// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ComputedStatus }) {
  const styles: Record<ComputedStatus, string> = {
    valid: "bg-green-50 text-green-700 ring-green-600/20",
    expiring_soon: "bg-amber-50 text-amber-700 ring-amber-600/20",
    expired: "bg-red-50 text-red-700 ring-red-600/20",
    missing: "bg-gray-100 text-gray-600 ring-gray-500/20",
  };
  const labels: Record<ComputedStatus, string> = {
    valid: "Valid",
    expiring_soon: "Expiring soon",
    expired: "Expired",
    missing: "Missing",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function ToastBanner({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className={`fixed right-5 top-5 z-50 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${
        toast.type === "success"
          ? "border-green-200 bg-green-50 text-green-800"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      {toast.type === "success" ? (
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
        </svg>
      )}
      <span>{toast.message}</span>
      <button onClick={onDismiss} className="ml-2 opacity-60 hover:opacity-100">
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      </button>
    </div>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
        <div className="mb-1 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100">
            <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Delete record</h2>
            <p className="text-sm text-gray-500">This action cannot be undone.</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={loading} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={loading} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">{loading ? "Deleting…" : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Record slide-over panel ──────────────────────────────────────────────────

type PanelMode = { mode: "add"; complianceType: ComplianceType } | { mode: "edit"; record: ComplianceRecord; complianceType: ComplianceType };

type RecordFormState = {
  issueDate: string;
  expiryDate: string;
  notes: string;
  documentUrl: string;
};

function RecordPanel({
  panel,
  propertyId,
  onSaved,
  onClose,
}: {
  panel: PanelMode;
  propertyId: string;
  onSaved: () => void;
  onClose: () => void;
}) {
  const isEdit = panel.mode === "edit";
  const existing = isEdit ? panel.record : null;

  const [form, setForm] = useState<RecordFormState>({
    issueDate: existing?.issue_date ?? "",
    expiryDate: existing?.expiry_date ?? "",
    notes: existing?.notes ?? "",
    documentUrl: existing?.document_url ?? "",
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function patch(p: Partial<RecordFormState>) {
    setForm((prev) => ({ ...prev, ...p }));
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploadError("Not authenticated."); setUploading(false); return; }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${user.id}/${propertyId}/${Date.now()}-${safeName}`;

    const { error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { upsert: false });

    if (uploadErr) {
      setUploadError(uploadErr.message);
      setUploading(false);
      return;
    }

    patch({ documentUrl: path });
    setUploading(false);
    e.target.value = "";
  }

  async function handleRemoveFile() {
    if (!form.documentUrl) return;
    const supabase = createClient();
    await supabase.storage.from(STORAGE_BUCKET).remove([form.documentUrl]);
    patch({ documentUrl: "" });
  }

  async function handleViewDocument() {
    if (!form.documentUrl) return;
    const supabase = createClient();
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(form.documentUrl, 3600);
    if (error || !data) return;
    window.open(data.signedUrl, "_blank");
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const supabase = createClient();
    const payload = {
      issue_date: form.issueDate || null,
      expiry_date: form.expiryDate || null,
      notes: form.notes || null,
      document_url: form.documentUrl || null,
    };

    const { error: dbError } = isEdit
      ? await supabase.from("compliance_records").update(payload).eq("id", existing!.id)
      : await supabase.from("compliance_records").insert({
          ...payload,
          property_id: propertyId,
          compliance_type_id: panel.complianceType.id,
        });

    setSaving(false);
    if (dbError) { setError(dbError.message); return; }
    onSaved();
  }

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-40 flex w-full sm:max-w-md flex-col bg-white shadow-2xl ring-1 ring-black/5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {isEdit ? "Edit record" : "Add record"}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">{panel.complianceType.name}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form id="record-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Issue date <span className="font-normal text-gray-400">(optional)</span></label>
            <input ref={firstRef} type="date" value={form.issueDate} onChange={(e) => patch({ issueDate: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Expiry date <span className="font-normal text-gray-400">(optional)</span></label>
            <input type="date" value={form.expiryDate} onChange={(e) => patch({ expiryDate: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Document <span className="font-normal text-gray-400">(optional)</span></label>
            {form.documentUrl ? (
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <svg className="h-4 w-4 shrink-0 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M15.621 4.379a3 3 0 0 0-4.242 0l-7 7a3 3 0 0 0 4.241 4.243h.001l.497-.5a.75.75 0 0 1 1.064 1.057l-.498.501-.002.002a4.5 4.5 0 0 1-6.364-6.364l7-7a4.5 4.5 0 0 1 6.368 6.36l-3.455 3.553A2.625 2.625 0 1 1 9.52 9.52l3.45-3.451a.75.75 0 1 1 1.061 1.06l-3.45 3.451a1.125 1.125 0 0 0 1.587 1.595l3.454-3.553a3 3 0 0 0 0-4.242Z" clipRule="evenodd" />
                </svg>
                <button onClick={handleViewDocument} className="min-w-0 flex-1 truncate text-xs text-indigo-600 hover:text-indigo-500 text-left">
                  View document
                </button>
                <button type="button" onClick={handleRemoveFile} className="ml-1 shrink-0 text-gray-400 hover:text-red-500" title="Remove">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              </div>
            ) : (
              <label className={`flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2.5 text-sm text-gray-600 transition hover:border-indigo-400 hover:text-indigo-600 ${uploading ? "pointer-events-none opacity-60" : ""}`}>
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z" />
                  <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                </svg>
                <span>{uploading ? "Uploading…" : "Upload document"}</span>
                <input type="file" className="sr-only" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleFileChange} disabled={uploading} />
              </label>
            )}
            {uploadError && <p className="mt-1.5 text-xs text-red-600">{uploadError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes <span className="font-normal text-gray-400">(optional)</span></label>
            <textarea rows={3} value={form.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder="Any additional notes…" className={inputClass} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" form="record-form" disabled={saving || uploading} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add record"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [rows, setRows] = useState<ComplianceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [panel, setPanel] = useState<PanelMode | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<ComplianceRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Load property list once
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("properties")
        .select("id, address_line_1, city, postcode")
        .order("address_line_1", { ascending: true });
      setProperties(data ?? []);
    }
    load();
  }, []);

  // Load compliance rows whenever selected property or refresh changes
  useEffect(() => {
    if (!selectedPropertyId) {
      setRows([]);
      return;
    }

    async function loadRows() {
      setLoading(true);
      setFetchError("");

      const supabase = createClient();

      // Query 1: required compliance types for this property
      // Uses FK hint to bypass potential RLS on compliance_types
      const { data: reqRaw, error: reqError } = await supabase
        .from("property_compliance_requirements")
        .select("compliance_type_id, compliance_types!compliance_type_id(id, code, name)")
        .eq("property_id", selectedPropertyId)
        .eq("is_required", true);

      // Query 2: existing compliance records for this property
      const { data: recordsRaw, error: recordsError } = await supabase
        .from("compliance_records")
        .select("id, property_id, compliance_type_id, issue_date, expiry_date, notes, document_url")
        .eq("property_id", selectedPropertyId);

      setLoading(false);

      if (reqError || recordsError) {
        setFetchError((reqError ?? recordsError)!.message);
        return;
      }

      // Extract compliance types from joined result
      const types: ComplianceType[] = ((reqRaw ?? []) as any[])
        .map((row) => {
          const ct = Array.isArray(row.compliance_types)
            ? row.compliance_types[0]
            : row.compliance_types;
          if (!ct?.id) return null;
          return { id: ct.id as string, code: ct.code as string, name: ct.name as string };
        })
        .filter((ct): ct is ComplianceType => ct !== null);

      const records = (recordsRaw ?? []) as ComplianceRecord[];

      // Merge: one row per required type, matched to its record by compliance_type_id
      const merged: ComplianceRow[] = types.map((ct) => ({
        complianceType: ct,
        record: records.find((r) => r.compliance_type_id === ct.id) ?? null,
      }));

      // Sort by urgency: expired → expiring_soon → missing → valid
      merged.sort(
        (a, b) =>
          STATUS_ORDER[computeStatus(a.record)] - STATUS_ORDER[computeStatus(b.record)]
      );

      setRows(merged);
    }

    loadRows();
  }, [selectedPropertyId, refreshKey]);

  async function handleDeleteConfirm() {
    if (!deletingRecord) return;
    setDeleteLoading(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("compliance_records")
      .delete()
      .eq("id", deletingRecord.id);

    setDeleteLoading(false);
    setDeletingRecord(null);

    if (error) { setToast({ type: "error", message: error.message }); return; }
    setToast({ type: "success", message: "Record deleted." });
    refresh();
  }

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);

  return (
    <div className="flex flex-col min-h-full">
      {toast && <ToastBanner toast={toast} onDismiss={() => setToast(null)} />}

      {panel && (
        <RecordPanel
          panel={panel}
          propertyId={selectedPropertyId}
          onSaved={() => {
            setPanel(null);
            setToast({ type: "success", message: panel.mode === "add" ? "Record added." : "Record updated." });
            refresh();
          }}
          onClose={() => setPanel(null)}
        />
      )}

      {deletingRecord && (
        <DeleteConfirmModal
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingRecord(null)}
          loading={deleteLoading}
        />
      )}

      {/* Page header */}
      <div className="border-b border-gray-200 bg-white px-4 py-5 sm:px-8 sm:py-6">
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Compliance</h1>
        <p className="mt-0.5 text-sm text-gray-500">Track certificates and regulatory requirements per property</p>
      </div>

      <div className="p-4 sm:p-8">

      {/* Property selector */}
      <div className="mb-6">
        <label htmlFor="property_select" className="block text-sm font-medium text-gray-700 mb-1.5">
          Select property
        </label>
        <select
          id="property_select"
          value={selectedPropertyId}
          onChange={(e) => setSelectedPropertyId(e.target.value)}
          className="w-full sm:max-w-sm rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-xs transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">Choose a property…</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.address_line_1}, {p.city}, {p.postcode}
            </option>
          ))}
        </select>
      </div>

      {/* Empty state — no property selected */}
      {!selectedProperty && (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M1 2.75A.75.75 0 0 1 1.75 2h10.5a.75.75 0 0 1 0 1.5H12v13.75a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1-.75-.75v-2.5a.75.75 0 0 0-.75-.75h-2.5a.75.75 0 0 0-.75.75v2.5a.75.75 0 0 1-.75.75H3a.75.75 0 0 1-.75-.75V3.5h-.5A.75.75 0 0 1 1 2.75ZM4 5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1ZM4.5 9a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1ZM8 5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1ZM8.5 9a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1Z" clipRule="evenodd" />
              <path d="M14.25 6.495a.75.75 0 0 1 .75.75V16.75h.25a.75.75 0 0 1 0 1.5h-5a.75.75 0 0 1 0-1.5H10.5V7.245a.75.75 0 0 1 .75-.75h3Z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">No property selected</p>
          <p className="mt-1 text-sm text-gray-400">Choose a property above to view its compliance status.</p>
        </div>
      )}

      {/* Property selected — show table */}
      {selectedProperty && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">
              Loading…
            </div>
          ) : fetchError ? (
            <p className="text-sm text-red-600">{fetchError}</p>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-8 text-center">
              <p className="text-sm font-medium text-amber-900">No required compliance items</p>
              <p className="mt-1 text-sm text-amber-700">
                Set up the requirements for this property first.{" "}
                <a href={`/properties/${selectedPropertyId}/requirements`} className="font-medium underline">
                  Go to requirements →
                </a>
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              {/* Desktop table */}
              <table className="hidden sm:table w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Compliance type</th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Status</th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Expiry</th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map(({ complianceType: ct, record }) => {
                    const status = computeStatus(record);
                    return (
                      <tr key={ct.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">{ct.name}</td>
                        <td className="px-6 py-4"><StatusBadge status={status} /></td>
                        <td className="px-6 py-4 text-gray-500 tabular-nums">{record ? formatDate(record.expiry_date) : "—"}</td>
                        <td className="px-6 py-4">
                          {record ? (
                            <div className="flex items-center gap-3">
                              <button onClick={() => setPanel({ mode: "edit", record, complianceType: ct })} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">Edit</button>
                              <button onClick={() => setDeletingRecord(record)} className="text-sm font-medium text-red-600 hover:text-red-500">Delete</button>
                            </div>
                          ) : (
                            <button onClick={() => setPanel({ mode: "add", complianceType: ct })} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50">
                              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>
                              Add record
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile card list */}
              <div className="sm:hidden divide-y divide-gray-100">
                {rows.map(({ complianceType: ct, record }) => {
                  const status = computeStatus(record);
                  return (
                    <div key={ct.id} className="px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm">{ct.name}</p>
                          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                            <StatusBadge status={status} />
                            {record?.expiry_date && (
                              <span className="text-xs text-gray-400">Expires {formatDate(record.expiry_date)}</span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0">
                          {record ? (
                            <div className="flex items-center gap-3">
                              <button onClick={() => setPanel({ mode: "edit", record, complianceType: ct })} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">Edit</button>
                              <button onClick={() => setDeletingRecord(record)} className="text-sm font-medium text-red-600 hover:text-red-500">Delete</button>
                            </div>
                          ) : (
                            <button onClick={() => setPanel({ mode: "add", complianceType: ct })} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700">
                              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
      </div> {/* end p-4 sm:p-8 */}
    </div>
  );
}
