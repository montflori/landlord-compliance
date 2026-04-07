"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  occupancy_status: "occupied" | "vacant" | null;
  landlords: { full_name: string } | null;
};

type Landlord = { id: string; full_name: string };

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

// ─── Constants ────────────────────────────────────────────────────────────────

const PROPERTY_TYPES = [
  "Detached", "Semi-detached", "Terraced", "Flat / Apartment",
  "Bungalow", "Studio", "HMO", "Other",
];

const STORAGE_BUCKET = "property-documents";

const DOCUMENT_TYPES: {
  key: PropertyDocument["document_type"];
  label: string;
  description: string;
}[] = [
  { key: "tenancy_agreement", label: "Tenancy Agreement", description: "Signed tenancy agreement document" },
  { key: "dps", label: "DPS Certificate", description: "Deposit protection scheme certificate" },
  { key: "inventory_log", label: "Inventory Log", description: "Property inventory and condition report" },
];

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-xs transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}


// ─── Toast ────────────────────────────────────────────────────────────────────

function ToastBanner({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className={`fixed right-5 top-5 z-50 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${
      toast.type === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"
    }`}>
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
  property, onConfirm, onCancel, loading,
}: {
  property: Property; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
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
            <h2 className="text-sm font-semibold text-gray-900">Delete property</h2>
            <p className="text-sm text-gray-500">This action cannot be undone.</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-gray-600">
          Are you sure you want to delete{" "}
          <span className="font-medium text-gray-900">{property.address_line_1}</span>?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={loading}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={loading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60">
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add property panel ───────────────────────────────────────────────────────

function AddPropertyPanel({ landlords, onAdded, onClose }: {
  landlords: Landlord[]; onAdded: () => void; onClose: () => void;
}) {
  const [landlordId, setLandlordId] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const firstRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) { setError("You must be logged in."); setLoading(false); return; }
    const { error: insertError } = await supabase.from("properties").insert({
      landlord_id: landlordId, address_line_1: addressLine1,
      address_line_2: addressLine2 || null, city, postcode,
      property_type: propertyType, bedrooms: parseInt(bedrooms, 10),
    });
    setLoading(false);
    if (insertError) { setError(insertError.message); return; }
    onAdded();
  }

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col bg-white shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Add property</h2>
            <p className="mt-0.5 text-xs text-gray-400">Fill in the details below to add a new property.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
        <form id="add-property-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Landlord</label>
              <select ref={firstRef} required value={landlordId} onChange={(e) => setLandlordId(e.target.value)} className={inputClass}>
                <option value="">Select a landlord…</option>
                {landlords.map((l) => <option key={l.id} value={l.id}>{l.full_name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Address line 1</label>
              <input type="text" required value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="12 High Street" className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Address line 2 <span className="font-normal text-gray-400">(optional)</span></label>
              <input type="text" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} placeholder="Flat 2" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
              <input type="text" required value={city} onChange={(e) => setCity(e.target.value)} placeholder="Manchester" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Postcode</label>
              <input type="text" required value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="M1 1AA" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Property type</label>
              <select required value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className={inputClass}>
                <option value="">Select a type…</option>
                {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bedrooms</label>
              <input type="number" required min={1} max={20} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} placeholder="3" className={inputClass} />
            </div>
          </div>
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </form>
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" form="add-property-form" disabled={loading} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
            {loading ? "Adding…" : "Add property"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Occupancy badge ──────────────────────────────────────────────────────────

function OccupancyBadge({ status }: { status: Property["occupancy_status"] }) {
  if (status === "occupied") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        Occupied
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 ring-1 ring-inset ring-gray-400/20">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
      Vacant
    </span>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({ title, children, action }: {
  title: string; children: React.ReactNode; action?: React.ReactNode;
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

// ─── Field (read view) ────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-sm text-gray-700">{value ?? "—"}</p>
    </div>
  );
}

// ─── Property details section ─────────────────────────────────────────────────

function PropertyDetailsSection({ property }: { property: Property }) {
  const landlord = Array.isArray(property.landlords) ? property.landlords[0] : property.landlords;
  return (
    <SectionCard title="Property details">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field label="Address" value={[property.address_line_1, property.address_line_2].filter(Boolean).join(", ")} />
        <Field label="City" value={property.city} />
        <Field label="Postcode" value={property.postcode} />
        <Field label="Type" value={property.property_type} />
        <Field label="Bedrooms" value={String(property.bedrooms)} />
        <Field label="Landlord" value={landlord?.full_name ?? null} />
      </div>
    </SectionCard>
  );
}

// ─── Tenant section ───────────────────────────────────────────────────────────

function TenantSection({ propertyId, onToast, onSaved }: { propertyId: string; onToast: (t: Toast) => void; onSaved?: () => void }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    lead_tenant_name: "", lead_tenant_email: "", lead_tenant_phone: "",
    additional_tenants: "", tenancy_start_date: "", tenancy_end_date: "",
    monthly_rent: "", deposit_amount: "", notes: "",
  });

  useEffect(() => {
    setLoading(true);
    setEditing(false);
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from("property_tenants").select("*").eq("property_id", propertyId).maybeSingle();
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
      } else {
        setTenant(null);
      }
      setLoading(false);
    }
    load();
  }, [propertyId]);

  function patch(p: Partial<typeof form>) { setForm((prev) => ({ ...prev, ...p })); }

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
      ? await supabase.from("property_tenants").update(payload).eq("id", tenant.id).select().single()
      : await supabase.from("property_tenants").insert(payload).select().single();
    setSaving(false);
    if (error) { onToast({ type: "error", message: error.message }); return; }
    setTenant(data);
    setEditing(false);
    onToast({ type: "success", message: "Tenant information saved." });
    onSaved?.();
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
    <button type="button" onClick={() => setEditing(true)}
      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
      {tenant ? "Edit" : "Add"}
    </button>
  ) : (
    <div className="flex items-center gap-2">
      <button type="button" onClick={handleCancel} disabled={saving}
        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60">
        Cancel
      </button>
      <button type="button" onClick={handleSave} disabled={saving}
        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60">
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
          <button type="button" onClick={() => setEditing(true)} className="font-medium text-indigo-600 hover:text-indigo-500">
            Add tenant →
          </button>
        </p>
      ) : editing ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Lead tenant name</label>
            <input type="text" value={form.lead_tenant_name} onChange={(e) => patch({ lead_tenant_name: e.target.value })} placeholder="Jane Smith" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Lead tenant email</label>
            <input type="email" value={form.lead_tenant_email} onChange={(e) => patch({ lead_tenant_email: e.target.value })} placeholder="jane@example.com" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Lead tenant phone</label>
            <input type="tel" value={form.lead_tenant_phone} onChange={(e) => patch({ lead_tenant_phone: e.target.value })} placeholder="+44 7700 900000" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Additional tenants <span className="font-normal text-gray-400">(optional)</span></label>
            <input type="text" value={form.additional_tenants} onChange={(e) => patch({ additional_tenants: e.target.value })} placeholder="John Smith, Sarah Jones" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tenancy start date</label>
            <input type="date" value={form.tenancy_start_date} onChange={(e) => patch({ tenancy_start_date: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tenancy end date</label>
            <input type="date" value={form.tenancy_end_date} onChange={(e) => patch({ tenancy_end_date: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Monthly rent (£)</label>
            <input type="number" min={0} step={0.01} value={form.monthly_rent} onChange={(e) => patch({ monthly_rent: e.target.value })} placeholder="1200" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Deposit amount (£)</label>
            <input type="number" min={0} step={0.01} value={form.deposit_amount} onChange={(e) => patch({ deposit_amount: e.target.value })} placeholder="1800" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes <span className="font-normal text-gray-400">(optional)</span></label>
            <textarea rows={3} value={form.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder="Any additional notes…" className={inputClass} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <Field label="Lead tenant" value={tenant?.lead_tenant_name} />
          <Field label="Email" value={tenant?.lead_tenant_email} />
          <Field label="Phone" value={tenant?.lead_tenant_phone} />
          <Field label="Additional tenants" value={tenant?.additional_tenants} />
          <Field label="Tenancy start" value={formatDate(tenant?.tenancy_start_date ?? null)} />
          <Field label="Tenancy end" value={formatDate(tenant?.tenancy_end_date ?? null)} />
          <Field label="Monthly rent" value={tenant?.monthly_rent != null ? `£${Number(tenant.monthly_rent).toLocaleString("en-GB", { minimumFractionDigits: 2 })}` : null} />
          <Field label="Deposit" value={tenant?.deposit_amount != null ? `£${Number(tenant.deposit_amount).toLocaleString("en-GB", { minimumFractionDigits: 2 })}` : null} />
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

function DocumentCard({ propertyId, docType, label, description, existing, onUploaded, onToast }: {
  propertyId: string;
  docType: PropertyDocument["document_type"];
  label: string;
  description: string;
  existing: PropertyDocument | null;
  onUploaded: (doc: PropertyDocument) => void;
  onToast: (t: Toast) => void;
}) {
  const [uploading, setUploading] = useState(false);

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

    // Delete any existing row for this slot first (avoids UPDATE path RLS issues
    // on rows that may have been created without a user_id)
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
    onToast({ type: "success", message: `${label} ${existing ? "replaced" : "uploaded"}.` });
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
    <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        {existing ? (
          <button onClick={handleView}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-500">
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
      <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 ${uploading ? "pointer-events-none opacity-60" : ""}`}>
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z" />
          <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
        </svg>
        {uploading ? "Uploading…" : existing ? "Replace" : "Upload"}
        <input type="file" className="sr-only" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleFile} disabled={uploading} />
      </label>
    </div>
  );
}

// ─── Documents section ────────────────────────────────────────────────────────

function DocumentsSection({ propertyId, onToast }: { propertyId: string; onToast: (t: Toast) => void }) {
  const [docs, setDocs] = useState<PropertyDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from("property_documents").select("*").eq("property_id", propertyId);
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
            <DocumentCard key={key} propertyId={propertyId} docType={key} label={label} description={description}
              existing={docs.find((d) => d.document_type === key) ?? null}
              onUploaded={handleUploaded} onToast={onToast} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showPanel, setShowPanel] = useState(false);
  const [deletingProperty, setDeletingProperty] = useState<Property | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [fetchError, setFetchError] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: propData, error: propError }, { data: landlordData }] = await Promise.all([
        supabase.from("properties")
          .select("id, address_line_1, address_line_2, city, postcode, property_type, bedrooms, occupancy_status, landlords(full_name)")
          .order("address_line_1", { ascending: true }),
        supabase.from("landlords").select("id, full_name").order("full_name", { ascending: true }),
      ]);
      if (propError) { setFetchError(propError.message); return; }
      setProperties((propData as unknown as Property[]) ?? []);
      setLandlords(landlordData ?? []);
    }
    load();
  }, [refreshKey]);

  // Filter properties by search query
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter((p) =>
      p.address_line_1.toLowerCase().includes(q) ||
      (p.address_line_2 ?? "").toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q) ||
      p.postcode.toLowerCase().includes(q)
    );
  }, [properties, query]);

  const selectedProperty = properties.find((p) => p.id === selectedId) ?? null;

  async function refreshPropertyStatus(id: string) {
    const supabase = createClient();
    const { data } = await supabase.from("properties").select("occupancy_status").eq("id", id).single();
    if (!data) return;
    setProperties((prev) =>
      prev.map((p) => p.id === id ? { ...p, occupancy_status: data.occupancy_status } : p)
    );
  }

  async function handleDeleteConfirm() {
    if (!deletingProperty) return;
    setDeleteLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("properties").delete().eq("id", deletingProperty.id);
    setDeleteLoading(false);
    setDeletingProperty(null);
    if (error) { setToast({ type: "error", message: error.message }); return; }
    if (selectedId === deletingProperty.id) setSelectedId(null);
    setToast({ type: "success", message: "Property deleted." });
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="flex flex-col min-h-full p-8">
      {toast && <ToastBanner toast={toast} onDismiss={() => setToast(null)} />}

      {deletingProperty && (
        <DeleteConfirmModal property={deletingProperty} onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingProperty(null)} loading={deleteLoading} />
      )}

      {showPanel && (
        <AddPropertyPanel landlords={landlords}
          onAdded={() => { setShowPanel(false); setToast({ type: "success", message: "Property added." }); setRefreshKey((k) => k + 1); }}
          onClose={() => setShowPanel(false)} />
      )}

      {/* ── Header ── */}
      <div className="border-b border-gray-200 bg-white px-8 py-6 -mx-8 -mt-8 mb-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">Properties</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {properties.length > 0 ? `${properties.length} propert${properties.length === 1 ? "y" : "ies"} in your portfolio` : "Manage your property portfolio"}
            </p>
          </div>
          <button type="button" onClick={() => setShowPanel(true)}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            Add property
          </button>
        </div>
      </div>

      {fetchError && <p className="mb-4 text-sm text-red-600">{fetchError}</p>}

      {/* ── Search ── */}
      <div className="relative mb-6">
        <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by address, city or postcode…"
          className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 shadow-xs transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* ── Property cards ── */}
      {properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-3">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">No properties yet</p>
          <p className="mt-1 text-sm text-gray-400">Add your first property to start tracking compliance.</p>
          <button type="button" onClick={() => setShowPanel(true)} className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Add your first property
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-12 text-center">
          <p className="text-sm font-medium text-gray-700">No properties match &ldquo;{query}&rdquo;</p>
          <button type="button" onClick={() => setQuery("")} className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 font-medium">Clear search</button>
        </div>
      ) : (
        <div ref={cardsRef} className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((p) => {
            const isSelected = p.id === selectedId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(isSelected ? null : p.id)}
                className={`flex flex-col rounded-xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
                  isSelected
                    ? "border-indigo-400 bg-indigo-50 shadow-sm ring-1 ring-indigo-400/30"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-lg ${isSelected ? "bg-indigo-100" : "bg-gray-100"}`}>
                  <svg className={`h-4 w-4 ${isSelected ? "text-indigo-600" : "text-gray-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                  </svg>
                </div>
                <p className={`text-sm font-semibold leading-snug ${isSelected ? "text-indigo-900" : "text-gray-900"}`}>
                  {p.address_line_1}
                </p>
                <p className={`mt-0.5 text-xs ${isSelected ? "text-indigo-500" : "text-gray-400"}`}>
                  {p.city}, {p.postcode}
                </p>
                <div className="mt-3">
                  <OccupancyBadge status={p.occupancy_status} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Selected property detail ── */}
      {selectedProperty && (
        <div className="space-y-6">
          {/* Selected property header */}
          <div className="flex items-start justify-between gap-4 rounded-xl border border-indigo-100 bg-indigo-50/50 px-6 py-5">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-semibold text-gray-900">{selectedProperty.address_line_1}</h2>
                <OccupancyBadge status={selectedProperty.occupancy_status} />
              </div>
              <p className="mt-0.5 text-sm text-gray-500">
                {[selectedProperty.address_line_2, selectedProperty.city, selectedProperty.postcode].filter(Boolean).join(", ")}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <a href={`/properties/${selectedProperty.id}/requirements`}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-xs transition hover:bg-gray-50">
                Requirements
              </a>
              <button type="button" onClick={() => setDeletingProperty(selectedProperty)}
                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50">
                Delete
              </button>
            </div>
          </div>

          <PropertyDetailsSection property={selectedProperty} />
          <TenantSection propertyId={selectedProperty.id} onToast={setToast} onSaved={() => refreshPropertyStatus(selectedProperty.id)} />
          <DocumentsSection propertyId={selectedProperty.id} onToast={setToast} />
        </div>
      )}
    </div>
  );
}
