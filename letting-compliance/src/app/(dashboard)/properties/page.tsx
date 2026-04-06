"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type Landlord = {
  id: string;
  full_name: string;
};

type Property = {
  id: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  postcode: string;
  property_type: string;
  bedrooms: number;
  created_at: string;
  landlords: { full_name: string } | null;
};

type ComplianceStat = { required: number; covered: number };

type Toast = { type: "success" | "error"; message: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const PROPERTY_TYPES = [
  "Detached",
  "Semi-detached",
  "Terraced",
  "Flat / Apartment",
  "Bungalow",
  "Studio",
  "HMO",
  "Other",
];

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-xs transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

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

// ─── Compliance pill ──────────────────────────────────────────────────────────

function CompliancePill({ stat }: { stat: ComplianceStat | undefined }) {
  if (!stat || stat.required === 0) {
    return <span className="text-xs text-gray-400">No requirements set</span>;
  }

  const { covered, required } = stat;
  const pct = Math.round((covered / required) * 100);
  const allDone = covered === required;
  const atRisk = pct < 50;

  const barColor = allDone ? "bg-green-500" : atRisk ? "bg-red-400" : "bg-indigo-500";
  const textColor = allDone ? "text-green-700" : atRisk ? "text-red-600" : "text-gray-700";

  return (
    <div className="w-36 shrink-0">
      <div className="flex items-baseline justify-between gap-1">
        <span className={`text-sm font-semibold tabular-nums ${textColor}`}>
          {covered} / {required}
        </span>
        <span className="text-xs text-gray-400">compliant</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-100">
        <div
          className={`h-1.5 rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Property row ─────────────────────────────────────────────────────────────

function PropertyRow({
  property,
  stat,
}: {
  property: Property;
  stat: ComplianceStat | undefined;
}) {
  const landlord = Array.isArray(property.landlords)
    ? property.landlords[0]
    : property.landlords;

  return (
    <div className="flex items-center gap-6 px-6 py-4 hover:bg-gray-50">
      {/* Address */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Link
            href={`/properties/${property.id}`}
            className="font-medium text-gray-900 hover:text-indigo-600"
          >
            {property.address_line_1}
            {property.address_line_2 ? `, ${property.address_line_2}` : ""}
          </Link>
          <span className="text-xs text-gray-400">
            {property.property_type} · {property.bedrooms} bed
          </span>
        </div>
        <p className="mt-0.5 text-sm text-gray-500">
          {property.city}, {property.postcode}
        </p>
        {landlord?.full_name && (
          <p className="mt-1 text-xs text-gray-400">{landlord.full_name}</p>
        )}
      </div>

      {/* Compliance */}
      <CompliancePill stat={stat} />

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-4">
        <Link
          href={`/properties/${property.id}`}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          View
        </Link>
        <Link
          href={`/properties/${property.id}/requirements`}
          className="text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          Requirements
        </Link>
      </div>
    </div>
  );
}

// ─── Add property slide-over ──────────────────────────────────────────────────

function AddPropertyPanel({
  landlords,
  onAdded,
  onClose,
}: {
  landlords: Landlord[];
  onAdded: () => void;
  onClose: () => void;
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

  const firstInputRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setError("You must be logged in to add a property.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("properties").insert({
      landlord_id: landlordId,
      address_line_1: addressLine1,
      address_line_2: addressLine2 || null,
      city,
      postcode,
      property_type: propertyType,
      bedrooms: parseInt(bedrooms, 10),
      // user_id omitted — set by DB default auth.uid()
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    onAdded();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Add property</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form
          id="add-property-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-5"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="landlord_id" className="block text-sm font-medium text-gray-700 mb-1.5">
                Landlord
              </label>
              <select
                id="landlord_id"
                ref={firstInputRef}
                required
                value={landlordId}
                onChange={(e) => setLandlordId(e.target.value)}
                className={inputClass}
              >
                <option value="">Select a landlord…</option>
                {landlords.map((l) => (
                  <option key={l.id} value={l.id}>{l.full_name}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="address_line_1" className="block text-sm font-medium text-gray-700 mb-1.5">
                Address line 1
              </label>
              <input
                id="address_line_1"
                type="text"
                required
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="12 High Street"
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="address_line_2" className="block text-sm font-medium text-gray-700 mb-1.5">
                Address line 2{" "}
                <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                id="address_line_2"
                type="text"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                placeholder="Flat 2"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1.5">
                City
              </label>
              <input
                id="city"
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Manchester"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-1.5">
                Postcode
              </label>
              <input
                id="postcode"
                type="text"
                required
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                placeholder="M1 1AA"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="property_type" className="block text-sm font-medium text-gray-700 mb-1.5">
                Property type
              </label>
              <select
                id="property_type"
                required
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className={inputClass}
              >
                <option value="">Select a type…</option>
                {PROPERTY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="bedrooms" className="block text-sm font-medium text-gray-700 mb-1.5">
                Bedrooms
              </label>
              <input
                id="bedrooms"
                type="number"
                required
                min={1}
                max={20}
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                placeholder="3"
                className={inputClass}
              />
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-property-form"
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Adding…" : "Add property"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [complianceStats, setComplianceStats] = useState<Map<string, ComplianceStat>>(new Map());
  const [showPanel, setShowPanel] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [fetchError, setFetchError] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      const [
        { data: propertyData, error: propertyError },
        { data: landlordData },
        { data: reqData },
        { data: recordData },
      ] = await Promise.all([
        supabase
          .from("properties")
          .select(
            "id, address_line_1, address_line_2, city, postcode, property_type, bedrooms, created_at, landlords(full_name)"
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("landlords")
          .select("id, full_name")
          .order("full_name", { ascending: true }),
        supabase
          .from("property_compliance_requirements")
          .select("property_id, compliance_type_id")
          .eq("is_required", true),
        supabase
          .from("compliance_records")
          .select("property_id, compliance_type_id"),
      ]);

      if (propertyError) {
        setFetchError(propertyError.message);
        return;
      }

      // Build per-property required sets
      const requiredByProperty = new Map<string, Set<string>>();
      for (const row of reqData ?? []) {
        if (!requiredByProperty.has(row.property_id)) {
          requiredByProperty.set(row.property_id, new Set());
        }
        requiredByProperty.get(row.property_id)!.add(row.compliance_type_id);
      }

      // Build per-property covered sets (only count records for required items)
      const coveredByProperty = new Map<string, Set<string>>();
      for (const row of recordData ?? []) {
        if (requiredByProperty.get(row.property_id)?.has(row.compliance_type_id)) {
          if (!coveredByProperty.has(row.property_id)) {
            coveredByProperty.set(row.property_id, new Set());
          }
          coveredByProperty.get(row.property_id)!.add(row.compliance_type_id);
        }
      }

      const stats = new Map<string, ComplianceStat>();
      for (const [pid, required] of requiredByProperty) {
        stats.set(pid, {
          required: required.size,
          covered: coveredByProperty.get(pid)?.size ?? 0,
        });
      }

      setProperties((propertyData as unknown as Property[]) ?? []);
      setLandlords(landlordData ?? []);
      setComplianceStats(stats);
    }

    fetchData();
  }, [refreshKey]);

  return (
    <div className="p-8">
      {toast && <ToastBanner toast={toast} onDismiss={() => setToast(null)} />}

      {showPanel && (
        <AddPropertyPanel
          landlords={landlords}
          onAdded={() => {
            setShowPanel(false);
            setToast({ type: "success", message: "Property added." });
            setRefreshKey((k) => k + 1);
          }}
          onClose={() => setShowPanel(false)}
        />
      )}

      {/* Page header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Properties</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage all properties under your agency
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowPanel(true)}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          Add property
        </button>
      </div>

      {/* Property list */}
      <div className="rounded-xl border border-gray-200 bg-white">
        {fetchError ? (
          <p className="px-6 py-4 text-sm text-red-600">{fetchError}</p>
        ) : properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
              <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M1 2.75A.75.75 0 0 1 1.75 2h10.5a.75.75 0 0 1 0 1.5H12v13.75a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1-.75-.75v-2.5a.75.75 0 0 0-.75-.75h-2.5a.75.75 0 0 0-.75.75v2.5a.75.75 0 0 1-.75.75H3a.75.75 0 0 1-.75-.75V3.5h-.5A.75.75 0 0 1 1 2.75ZM4 5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1ZM4.5 9a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1ZM8 5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1ZM8.5 9a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1Z" clipRule="evenodd" />
                <path d="M14.25 6.495a.75.75 0 0 1 .75.75V16.75h.25a.75.75 0 0 1 0 1.5h-5a.75.75 0 0 1 0-1.5H10.5V7.245a.75.75 0 0 1 .75-.75h3Z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">No properties yet</p>
            <p className="mt-1 text-sm text-gray-400">
              Add your first property to get started.
            </p>
            <button
              type="button"
              onClick={() => setShowPanel(true)}
              className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              Add a property →
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {properties.map((property) => (
              <li key={property.id}>
                <PropertyRow
                  property={property}
                  stat={complianceStats.get(property.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
