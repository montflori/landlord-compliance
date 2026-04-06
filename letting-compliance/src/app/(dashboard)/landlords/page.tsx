"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type Landlord = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  property_count: number;
};

type Toast = { type: "success" | "error"; message: string };

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Delete confirm modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({
  landlord,
  onConfirm,
  onCancel,
  loading,
}: {
  landlord: Landlord;
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
            <h2 className="text-sm font-semibold text-gray-900">Delete landlord</h2>
            <p className="text-sm text-gray-500">This action cannot be undone.</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-gray-600">
          Are you sure you want to delete{" "}
          <span className="font-medium text-gray-900">{landlord.full_name}</span>?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

function EditModal({
  landlord,
  onSaved,
  onCancel,
}: {
  landlord: Landlord;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [fullName, setFullName] = useState(landlord.full_name);
  const [email, setEmail] = useState(landlord.email);
  const [phone, setPhone] = useState(landlord.phone ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("landlords")
      .update({ full_name: fullName, email, phone: phone || null })
      .eq("id", landlord.id);

    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Edit landlord</h2>
          <button type="button" onClick={onCancel} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
            <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone <span className="font-normal text-gray-400">(optional)</span></label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44 7700 900000" className={inputClass} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onCancel} disabled={loading} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60">Cancel</button>
            <button type="submit" disabled={loading} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">{loading ? "Saving…" : "Save changes"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Add landlord panel ───────────────────────────────────────────────────────

function AddLandlordPanel({
  onAdded,
  onClose,
}: {
  onAdded: () => void;
  onClose: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

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
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in to add a landlord.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("landlords")
      .insert({ full_name: fullName, email, phone: phone || null, user_id: user.id });

    setLoading(false);
    if (insertError) { setError(insertError.message); return; }
    onAdded();
  }

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Add landlord</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
        <form id="add-landlord-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
            <input id="full_name" type="text" required ref={firstInputRef} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith" className={inputClass} />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" className={inputClass} />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">Phone <span className="font-normal text-gray-400">(optional)</span></label>
            <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44 7700 900000" className={inputClass} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" form="add-landlord-form" disabled={loading} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
            {loading ? "Adding…" : "Add landlord"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Landlord row ─────────────────────────────────────────────────────────────

function LandlordRow({
  landlord,
  onEdit,
  onDelete,
}: {
  landlord: Landlord;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative flex items-center gap-4 px-6 py-4 hover:bg-gray-50">
      {/* Full-row link — sits behind action buttons */}
      <Link href={`/landlords/${landlord.id}`} className="absolute inset-0" aria-label={`View ${landlord.full_name}`} />

      {/* Avatar */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-700 select-none">
        {landlord.full_name.charAt(0).toUpperCase()}
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900 group-hover:text-indigo-600 truncate">
          {landlord.full_name}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-gray-500">
          <span className="truncate">{landlord.email}</span>
          {landlord.phone && (
            <span className="shrink-0">{landlord.phone}</span>
          )}
        </p>
      </div>

      {/* Property count */}
      <span className="relative z-10 shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
        {landlord.property_count} {landlord.property_count === 1 ? "property" : "properties"}
      </span>

      {/* Actions */}
      <div className="relative z-10 flex shrink-0 items-center gap-3 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onEdit(); }}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onDelete(); }}
          className="text-sm font-medium text-red-600 hover:text-red-500"
        >
          Delete
        </button>
      </div>

      {/* Chevron */}
      <svg className="relative z-0 h-4 w-4 shrink-0 text-gray-300 group-hover:text-gray-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
      </svg>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandlordsPage() {
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [query, setQuery] = useState("");
  const [showPanel, setShowPanel] = useState(false);
  const [editingLandlord, setEditingLandlord] = useState<Landlord | null>(null);
  const [deletingLandlord, setDeletingLandlord] = useState<Landlord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [fetchError, setFetchError] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    async function fetchLandlords() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("landlords")
        .select("id, full_name, email, phone, properties(id)")
        .order("full_name", { ascending: true });

      if (error) { setFetchError(error.message); return; }

      const mapped: Landlord[] = ((data ?? []) as any[]).map((l) => ({
        id: l.id as string,
        full_name: l.full_name as string,
        email: l.email as string,
        phone: (l.phone ?? null) as string | null,
        property_count: Array.isArray(l.properties) ? l.properties.length : 0,
      }));

      setLandlords(mapped);
    }

    fetchLandlords();
  }, [refreshKey]);

  // Client-side search across name, email, phone
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return landlords;
    return landlords.filter(
      (l) =>
        l.full_name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        (l.phone ?? "").toLowerCase().includes(q)
    );
  }, [landlords, query]);

  async function handleDeleteConfirm() {
    if (!deletingLandlord) return;
    setDeleteLoading(true);

    const supabase = createClient();
    const { error } = await supabase.from("landlords").delete().eq("id", deletingLandlord.id);

    setDeleteLoading(false);
    setDeletingLandlord(null);

    if (error) { setToast({ type: "error", message: error.message }); return; }
    setToast({ type: "success", message: "Landlord deleted." });
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="p-8">
      {toast && <ToastBanner toast={toast} onDismiss={() => setToast(null)} />}

      {showPanel && (
        <AddLandlordPanel
          onAdded={() => {
            setShowPanel(false);
            setToast({ type: "success", message: "Landlord added." });
            setRefreshKey((k) => k + 1);
          }}
          onClose={() => setShowPanel(false)}
        />
      )}

      {editingLandlord && (
        <EditModal
          landlord={editingLandlord}
          onSaved={() => {
            setEditingLandlord(null);
            setToast({ type: "success", message: "Landlord updated." });
            setRefreshKey((k) => k + 1);
          }}
          onCancel={() => setEditingLandlord(null)}
        />
      )}

      {deletingLandlord && (
        <DeleteConfirmModal
          landlord={deletingLandlord}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingLandlord(null)}
          loading={deleteLoading}
        />
      )}

      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Landlords</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your landlord portfolio</p>
        </div>
        <button
          type="button"
          onClick={() => setShowPanel(true)}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          Add landlord
        </button>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email or phone…"
          className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 shadow-xs transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* Landlord list */}
      <div className="rounded-xl border border-gray-200 bg-white">
        {fetchError ? (
          <p className="px-6 py-4 text-sm text-red-600">{fetchError}</p>
        ) : landlords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
              <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 17a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.808A7.475 7.475 0 0 1 14.5 16Z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">No landlords yet</p>
            <p className="mt-1 text-sm text-gray-400">Add your first landlord to get started.</p>
            <button type="button" onClick={() => setShowPanel(true)} className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-500">
              Add a landlord →
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-400">
            No landlords match &ldquo;{query}&rdquo;.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filtered.map((landlord) => (
              <li key={landlord.id}>
                <LandlordRow
                  landlord={landlord}
                  onEdit={() => setEditingLandlord(landlord)}
                  onDelete={() => setDeletingLandlord(landlord)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
