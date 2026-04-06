"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type Profile = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  email_reminders_enabled: boolean;
  dashboard_alerts_enabled: boolean;
  reminder_days_before: number;
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

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
          checked ? "bg-indigo-600" : "bg-gray-200"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  description,
  editing,
  onEdit,
  onCancel,
  onSave,
  saving,
  children,
}: {
  title: string;
  description: string;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      {/* Header row */}
      <div className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <p className="mt-0.5 text-sm text-gray-500">{description}</p>
        </div>
        {!editing ? (
          <button
            type="button"
            onClick={onEdit}
            className="ml-4 shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Edit
          </button>
        ) : (
          <div className="ml-4 flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>

      {/* Expanded edit area */}
      {editing && (
        <div className="border-t border-gray-100 px-5 pb-5 pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState("");

  // Agency details edit state
  const [agencyEditing, setAgencyEditing] = useState(false);
  const [agencySaving, setAgencySaving] = useState(false);
  const [agencyForm, setAgencyForm] = useState({ full_name: "", company_name: "", phone: "" });
  const [agencyError, setAgencyError] = useState("");

  // Notifications edit state
  const [notifEditing, setNotifEditing] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifForm, setNotifForm] = useState({
    email_reminders_enabled: false,
    dashboard_alerts_enabled: false,
    reminder_days_before: 30,
  });
  const [notifError, setNotifError] = useState("");

  const [toast, setToast] = useState<Toast | null>(null);

  // ── Load profile on mount ──────────────────────────────────────────────────

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoadError("Not authenticated."); return; }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, company_name, phone, email_reminders_enabled, dashboard_alerts_enabled, reminder_days_before")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no row found — treat as empty profile
        setLoadError(error.message);
        return;
      }

      const p: Profile = {
        id: user.id,
        full_name: data?.full_name ?? null,
        company_name: data?.company_name ?? null,
        phone: data?.phone ?? null,
        email_reminders_enabled: data?.email_reminders_enabled ?? false,
        dashboard_alerts_enabled: data?.dashboard_alerts_enabled ?? true,
        reminder_days_before: data?.reminder_days_before ?? 30,
      };

      setProfile(p);
      setAgencyForm({ full_name: p.full_name ?? "", company_name: p.company_name ?? "", phone: p.phone ?? "" });
      setNotifForm({
        email_reminders_enabled: p.email_reminders_enabled,
        dashboard_alerts_enabled: p.dashboard_alerts_enabled,
        reminder_days_before: p.reminder_days_before,
      });
    }

    loadProfile();
  }, []);

  // ── Save agency details ────────────────────────────────────────────────────

  async function saveAgency() {
    if (!profile) return;
    if (!agencyForm.full_name.trim()) { setAgencyError("Full name is required."); return; }

    setAgencyError("");
    setAgencySaving(true);

    const supabase = createClient();
    const { error } = await supabase.from("profiles").upsert({
      id: profile.id,
      full_name: agencyForm.full_name.trim(),
      company_name: agencyForm.company_name.trim() || null,
      phone: agencyForm.phone.trim() || null,
    });

    setAgencySaving(false);

    if (error) { setAgencyError(error.message); return; }

    setProfile((p) => p ? { ...p, ...agencyForm } : p);
    setAgencyEditing(false);
    setToast({ type: "success", message: "Agency details saved." });
  }

  function cancelAgency() {
    setAgencyForm({
      full_name: profile?.full_name ?? "",
      company_name: profile?.company_name ?? "",
      phone: profile?.phone ?? "",
    });
    setAgencyError("");
    setAgencyEditing(false);
  }

  // ── Save notifications ─────────────────────────────────────────────────────

  async function saveNotifications() {
    if (!profile) return;

    const days = Number(notifForm.reminder_days_before);
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      setNotifError("Reminder days must be between 1 and 365.");
      return;
    }

    setNotifError("");
    setNotifSaving(true);

    const supabase = createClient();
    const { error } = await supabase.from("profiles").upsert({
      id: profile.id,
      email_reminders_enabled: notifForm.email_reminders_enabled,
      dashboard_alerts_enabled: notifForm.dashboard_alerts_enabled,
      reminder_days_before: days,
    });

    setNotifSaving(false);

    if (error) { setNotifError(error.message); return; }

    setProfile((p) => p ? { ...p, ...notifForm } : p);
    setNotifEditing(false);
    setToast({ type: "success", message: "Notification preferences saved." });
  }

  function cancelNotifications() {
    setNotifForm({
      email_reminders_enabled: profile?.email_reminders_enabled ?? false,
      dashboard_alerts_enabled: profile?.dashboard_alerts_enabled ?? true,
      reminder_days_before: profile?.reminder_days_before ?? 30,
    });
    setNotifError("");
    setNotifEditing(false);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">
      {toast && <ToastBanner toast={toast} onDismiss={() => setToast(null)} />}

      <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
      <p className="mt-1 text-sm text-gray-500">Manage your agency account and preferences</p>

      {loadError && (
        <p className="mt-4 text-sm text-red-600">{loadError}</p>
      )}

      <div className="mt-6 space-y-4">
        {/* ── Agency details ── */}
        <SectionCard
          title="Agency details"
          description="Update your name, company, and contact information."
          editing={agencyEditing}
          onEdit={() => setAgencyEditing(true)}
          onCancel={cancelAgency}
          onSave={saveAgency}
          saving={agencySaving}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Full name
              </label>
              <input
                type="text"
                value={agencyForm.full_name}
                onChange={(e) => setAgencyForm((f) => ({ ...f, full_name: e.target.value }))}
                placeholder="Jane Smith"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Company name <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={agencyForm.company_name}
                onChange={(e) => setAgencyForm((f) => ({ ...f, company_name: e.target.value }))}
                placeholder="Acme Lettings Ltd"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="tel"
                value={agencyForm.phone}
                onChange={(e) => setAgencyForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+44 7700 900000"
                className={inputClass}
              />
            </div>
          </div>
          {agencyError && <p className="mt-3 text-sm text-red-600">{agencyError}</p>}
        </SectionCard>

        {/* ── Notifications ── */}
        <SectionCard
          title="Notifications"
          description="Configure email alerts for expiring certificates and compliance deadlines."
          editing={notifEditing}
          onEdit={() => setNotifEditing(true)}
          onCancel={cancelNotifications}
          onSave={saveNotifications}
          saving={notifSaving}
        >
          <div className="space-y-5">
            <Toggle
              checked={notifForm.email_reminders_enabled}
              onChange={(v) => setNotifForm((f) => ({ ...f, email_reminders_enabled: v }))}
              label="Email reminders"
              description="Receive email alerts when compliance records are due to expire."
            />
            <div className="border-t border-gray-100" />
            <Toggle
              checked={notifForm.dashboard_alerts_enabled}
              onChange={(v) => setNotifForm((f) => ({ ...f, dashboard_alerts_enabled: v }))}
              label="Dashboard alerts"
              description="Show expiring and missing items on the dashboard."
            />
            <div className="border-t border-gray-100" />
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1.5">
                Remind me this many days before expiry
              </label>
              <input
                type="number"
                min={1}
                max={365}
                value={notifForm.reminder_days_before}
                onChange={(e) =>
                  setNotifForm((f) => ({ ...f, reminder_days_before: parseInt(e.target.value, 10) || 1 }))
                }
                className="w-24 rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-xs transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <span className="ml-2 text-sm text-gray-500">days</span>
            </div>
          </div>
          {notifError && <p className="mt-3 text-sm text-red-600">{notifError}</p>}
        </SectionCard>
      </div>
    </div>
  );
}
