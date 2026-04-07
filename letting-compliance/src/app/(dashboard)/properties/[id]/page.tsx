"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type Property = {
  id: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  postcode: string;
  property_type: string;
  bedrooms: number;
  landlords: { full_name: string } | null;
};

type Tenant = {
  id: string;
  property_id: string;
  lead_tenant_name: string | null;
  lead_tenant_email: string | null;
  lead_tenant_phone: string | null;
  additional_tenants: string | null;
  tenancy_start_date: string | null;
  tenancy_end_date: string | null;
  monthly_rent: number | null;
  deposit_amount: number | null;
  notes: string | null;
};

type PropertyDocument = {
  id: string;
  user_id: string;
  property_id: string;
  document_type: "tenancy_agreement" | "dps" | "inventory_log";
  file_name: string;
  file_path: string;
  file_url: string;
  uploaded_at: string;
};

type Toast = { type: "success" | "error"; message: string };

const STORAGE_BUCKET = "property-documents";

const DOCUMENT_TYPES: {
  key: PropertyDocument["document_type"];
  label: string;
  description: string;
}[] = [
  {
    key: "tenancy_agreement",
    label: "Tenancy Agreement",
    description: "Signed tenancy agreement document",
  },
  {
    key: "dps",
    label: "DPS Certificate",
    description: "Deposit protection scheme certificate",
  },
  {
    key: "inventory_log",
    label: "Inventory Log",
    description: "Property inventory and condition report",
  },
];

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-xs transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

// ─── Toast ────────────────────────────────────────────────────────────────────

function ToastBanner({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
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

// ─── Section card wrapper ─────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-xs">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {action}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ─── Tenant section ───────────────────────────────────────────────────────────

function TenantSection({
  propertyId,
  onToast,
}: {
  propertyId: string;
  onToast: (t: Toast) => void;
}) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    lead_tenant_name: "",
    lead_tenant_email: "",
    lead_tenant_phone: "",
    additional_tenants: "",
    tenancy_start_date: "",
    tenancy_end_date: "",
    monthly_rent: "",
    deposit_amount: "",
    notes: "",
  });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("property_tenants")
        .select("*")
        .eq("property_id", propertyId)
        .maybeSingle();

      if (data) {
        setTenant(data);
        setForm({
          lead_tenant_name: data.lead_tenant_name ?? "",
          lead_tenant_email: data.lead_tenant_email ?? "",
          lead_tenant_phone: data.lead_tenant_phone ?? "",
          additional_tenants: data.additional_tenants ?? "",
          tenancy_start_date: data.tenancy_start_date ?? "",
          tenancy_end_date: data.tenancy_end_date ?? "",
          monthly_rent: data.monthly_rent != null ? String(data.monthly_rent) : "",
          deposit_amount: data.deposit_amount != null ? String(data.deposit_amount) : "",
          notes: data.notes ?? "",
        });
      }
      setLoading(false);
    }
    load();
  }, [propertyId]);

  function patch(p: Partial<typeof form>) {
    setForm((prev) => ({ ...prev, ...p }));
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();

    const payload = {
      property_id: propertyId,
      lead_tenant_name: form.lead_tenant_name || null,
      lead_tenant_email: form.lead_tenant_email || null,
      lead_tenant_phone: form.lead_tenant_phone || null,
      additional_tenants: form.additional_tenants || null,
      tenancy_start_date: form.tenancy_start_date || null,
      tenancy_end_date: form.tenancy_end_date || null,
      monthly_rent: form.monthly_rent ? parseFloat(form.monthly_rent) : null,
      deposit_amount: form.deposit_amount ? parseFloat(form.deposit_amount) : null,
      notes: form.notes || null,
    };

    const { data, error } = tenant
      ? await supabase
          .from("property_tenants")
          .update(payload)
          .eq("id", tenant.id)
          .select()
          .single()
      : await supabase
          .from("property_tenants")
          .insert(payload)
          .select()
          .single();

    setSaving(false);

    if (error) {
      onToast({ type: "error", message: error.message });
      return;
    }

    setTenant(data);
    setEditing(false);
    onToast({ type: "success", message: "Tenant information saved." });
  }

  function handleCancel() {
    if (tenant) {
      setForm({
        lead_tenant_name: tenant.lead_tenant_name ?? "",
        lead_tenant_email: tenant.lead_tenant_email ?? "",
        lead_tenant_phone: tenant.lead_tenant_phone ?? "",
        additional_tenants: tenant.additional_tenants ?? "",
        tenancy_start_date: tenant.tenancy_start_date ?? "",
        tenancy_end_date: tenant.tenancy_end_date ?? "",
        monthly_rent: tenant.monthly_rent != null ? String(tenant.monthly_rent) : "",
        deposit_amount: tenant.deposit_amount != null ? String(tenant.deposit_amount) : "",
        notes: tenant.notes ?? "",
      });
    }
    setEditing(false);
  }

  const action = !editing ? (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
    >
      {tenant ? "Edit" : "Add"}
    </button>
  ) : (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleCancel}
        disabled={saving}
        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );

  return (
    <SectionCard title="Tenant information" action={action}>
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : !editing && !tenant ? (
        <p className="text-sm text-gray-400">
          No tenant information yet.{" "}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Add tenant →
          </button>
        </p>
      ) : editing ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Lead tenant name
            </label>
            <input
              type="text"
              value={form.lead_tenant_name}
              onChange={(e) => patch({ lead_tenant_name: e.target.value })}
              placeholder="Jane Smith"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Lead tenant email
            </label>
            <input
              type="email"
              value={form.lead_tenant_email}
              onChange={(e) => patch({ lead_tenant_email: e.target.value })}
              placeholder="jane@example.com"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Lead tenant phone
            </label>
            <input
              type="tel"
              value={form.lead_tenant_phone}
              onChange={(e) => patch({ lead_tenant_phone: e.target.value })}
              placeholder="+44 7700 900000"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Additional tenants{" "}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={form.additional_tenants}
              onChange={(e) => patch({ additional_tenants: e.target.value })}
              placeholder="John Smith, Sarah Jones"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tenancy start date
            </label>
            <input
              type="date"
              value={form.tenancy_start_date}
              onChange={(e) => patch({ tenancy_start_date: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tenancy end date
            </label>
            <input
              type="date"
              value={form.tenancy_end_date}
              onChange={(e) => patch({ tenancy_end_date: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Monthly rent (£)
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.monthly_rent}
              onChange={(e) => patch({ monthly_rent: e.target.value })}
              placeholder="1200"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Deposit amount (£)
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.deposit_amount}
              onChange={(e) => patch({ deposit_amount: e.target.value })}
              placeholder="1800"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notes{" "}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              placeholder="Any additional notes about the tenancy…"
              className={inputClass}
            />
          </div>
        </div>
      ) : (
        // Read view
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <Field label="Lead tenant" value={tenant?.lead_tenant_name} />
          <Field label="Email" value={tenant?.lead_tenant_email} />
          <Field label="Phone" value={tenant?.lead_tenant_phone} />
          <Field label="Additional tenants" value={tenant?.additional_tenants} />
          <Field
            label="Tenancy start"
            value={formatDate(tenant?.tenancy_start_date ?? null)}
          />
          <Field
            label="Tenancy end"
            value={formatDate(tenant?.tenancy_end_date ?? null)}
          />
          <Field
            label="Monthly rent"
            value={
              tenant?.monthly_rent != null
                ? `£${Number(tenant.monthly_rent).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`
                : null
            }
          />
          <Field
            label="Deposit"
            value={
              tenant?.deposit_amount != null
                ? `£${Number(tenant.deposit_amount).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`
                : null
            }
          />
          {tenant?.notes && (
            <div className="sm:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Notes</p>
              <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{tenant.notes}</p>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

// ─── Document card ────────────────────────────────────────────────────────────

function DocumentCard({
  propertyId,
  docType,
  label,
  description,
  existing,
  onUploaded,
  onToast,
}: {
  propertyId: string;
  docType: PropertyDocument["document_type"];
  label: string;
  description: string;
  existing: PropertyDocument | null;
  onUploaded: (doc: PropertyDocument) => void;
  onToast: (t: Toast) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("[upload] auth error:", authError);
      onToast({ type: "error", message: "Not authenticated." });
      setUploading(false);
      return;
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${user.id}/${propertyId}/${docType}/${safeName}`;

    console.log("[upload] user.id:", user.id);
    console.log("[upload] propertyId:", propertyId);
    console.log("[upload] docType:", docType);
    console.log("[upload] filePath:", filePath);

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error("[upload] storage error:", uploadError);
      onToast({ type: "error", message: uploadError.message });
      setUploading(false);
      e.target.value = "";
      return;
    }

    console.log("[upload] storage upload succeeded");

    const { error: deleteError } = await supabase
      .from("property_documents")
      .delete()
      .eq("property_id", propertyId)
      .eq("document_type", docType);

    if (deleteError) {
      console.warn("[upload] delete existing row error (non-fatal):", deleteError);
    }

    const payload = {
      user_id: user.id,
      property_id: propertyId,
      document_type: docType,
      file_name: file.name,
      file_path: filePath,
      file_url: filePath,
    };

    console.log("[upload] inserting db payload:", JSON.stringify(payload, null, 2));

    const { data: doc, error: dbError } = await supabase
      .from("property_documents")
      .insert(payload)
      .select()
      .single();

    if (dbError) {
      console.error("[upload] db insert error:", dbError.message, dbError.details, dbError.hint);
      onToast({ type: "error", message: dbError.message });
      setUploading(false);
      e.target.value = "";
      return;
    }

    console.log("[upload] db insert succeeded:", doc);
    setUploading(false);
    e.target.value = "";
    onUploaded(doc);
    onToast({
      type: "success",
      message: `${label} ${existing ? "replaced" : "uploaded"}.`,
    });
  }

  async function handleView() {
    if (!existing) return;
    const storagePath = existing.file_path || existing.file_url;
    console.log("[view] generating signed URL for:", storagePath);
    const supabase = createClient();
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(storagePath, 3600);
    if (error || !data) {
      console.error("[view] signed URL error:", error);
      onToast({ type: "error", message: "Could not generate download link." });
      return;
    }
    console.log("[view] signed URL generated successfully");
    window.open(data.signedUrl, "_blank");
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        {existing ? (
          <button
            onClick={handleView}
            className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-500"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3Z" />
              <path d="M11.603 7.963a.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 1 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865Z" />
            </svg>
            {existing.file_name}
          </button>
        ) : (
          <p className="mt-2 text-xs text-gray-400">No document uploaded</p>
        )}
      </div>
      <div className="shrink-0">
        <label
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 ${
            uploading ? "pointer-events-none opacity-60" : ""
          }`}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z" />
            <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
          </svg>
          {uploading ? "Uploading…" : existing ? "Replace" : "Upload"}
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={handleFile}
            disabled={uploading}
          />
        </label>
      </div>
    </div>
  );
}

// ─── Documents section ────────────────────────────────────────────────────────

function DocumentsSection({
  propertyId,
  onToast,
}: {
  propertyId: string;
  onToast: (t: Toast) => void;
}) {
  const [docs, setDocs] = useState<PropertyDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("property_documents")
        .select("*")
        .eq("property_id", propertyId);
      setDocs((data as PropertyDocument[]) ?? []);
      setLoading(false);
    }
    load();
  }, [propertyId]);

  function handleUploaded(doc: PropertyDocument) {
    setDocs((prev) => {
      const idx = prev.findIndex((d) => d.document_type === doc.document_type);
      if (idx === -1) return [...prev, doc];
      const next = [...prev];
      next[idx] = doc;
      return next;
    });
  }

  return (
    <SectionCard title="Tenancy documents">
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="space-y-3">
          {DOCUMENT_TYPES.map(({ key, label, description }) => (
            <DocumentCard
              key={key}
              propertyId={propertyId}
              docType={key}
              label={label}
              description={description}
              existing={docs.find((d) => d.document_type === key) ?? null}
              onUploaded={handleUploaded}
              onToast={onToast}
            />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}


function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-sm text-gray-700">{value ?? "—"}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("properties")
        .select(
          "id, address_line_1, address_line_2, city, postcode, property_type, bedrooms, landlords(full_name)"
        )
        .eq("id", id)
        .single();

      const p = data as unknown as Property;
      const landlord = Array.isArray(p?.landlords) ? p.landlords[0] : p?.landlords;
      setProperty(p ? { ...p, landlords: landlord ?? null } : null);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-indigo-500" />
          <p className="text-sm text-gray-400">Loading property…</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 mb-3">
          <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-900">Property not found</p>
        <Link href="/properties" className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
          ← Back to properties
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      {toast && (
        <ToastBanner toast={toast} onDismiss={() => setToast(null)} />
      )}

      {/* Page header */}
      <div className="border-b border-gray-200 bg-white px-8 py-6">
        <Link
          href="/properties"
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
          Properties
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">
              {property.address_line_1}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {[property.address_line_2, property.city, property.postcode]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
          <Link
            href={`/properties/${id}/requirements`}
            className="shrink-0 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-xs transition hover:bg-gray-50"
          >
            Edit requirements
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-200">
            {property.property_type}
          </span>
          <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-200">
            {property.bedrooms} bedroom{property.bedrooms !== 1 ? "s" : ""}
          </span>
          {property.landlords?.full_name && (
            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200/60">
              {property.landlords.full_name}
            </span>
          )}
        </div>
      </div>

      {/* Sections */}
      <div className="p-8 space-y-6">
        <TenantSection propertyId={id} onToast={setToast} />
        <DocumentsSection propertyId={id} onToast={setToast} />
      </div>
    </div>
  );
}
