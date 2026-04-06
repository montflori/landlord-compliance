"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type RequirementRow = {
  id: string;
  property_id: string;
  compliance_type_id: string;
  is_required: boolean;
  notes: string | null;
  compliance_types: {
    code: string;
    name: string;
    description: string | null;
  } | null;
};

async function updateRequirement(
  id: string,
  isRequired: boolean
): Promise<string | null> {
  const supabase = createClient();
  const { error } = await supabase
    .from("property_compliance_requirements")
    .update({ is_required: isRequired })
    .eq("id", id);
  return error?.message ?? null;
}

export default function RequirementsChecklist({
  initialRequirements,
}: {
  initialRequirements: RequirementRow[];
}) {
  const [requirements, setRequirements] =
    useState<RequirementRow[]>(initialRequirements);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle(id: string) {
    const current = requirements.find((r) => r.id === id);
    if (!current) return;

    const next = !current.is_required;

    // Optimistic update
    setRequirements((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_required: next } : r))
    );
    setSaving(id);
    setError(null);

    const err = await updateRequirement(id, next);

    setSaving(null);

    if (err) {
      // Revert on error
      setRequirements((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_required: !next } : r))
      );
      setError(err);
    }
  }

  return (
    <div>
      <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {requirements.map((req) => {
          const ct = req.compliance_types;
          const isSaving = saving === req.id;

          return (
            <label
              key={req.id}
              className="flex cursor-pointer items-start gap-4 px-6 py-4 hover:bg-gray-50"
            >
              <div className="flex h-5 items-center pt-0.5">
                {isSaving ? (
                  <svg
                    className="h-4 w-4 animate-spin text-indigo-500"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4l3-3-3-3V4a10 10 0 100 20v-4l-3 3 3 3v-2a8 8 0 01-8-8z"
                    />
                  </svg>
                ) : (
                  <input
                    type="checkbox"
                    checked={req.is_required}
                    disabled={isSaving}
                    onChange={() => handleToggle(req.id)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {ct?.name ?? req.compliance_type_id}
                </p>
                {ct?.description && (
                  <p className="mt-0.5 text-xs text-gray-500">
                    {ct.description}
                  </p>
                )}
              </div>

              <div className="shrink-0">
                {req.is_required ? (
                  <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                    Required
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 ring-1 ring-inset ring-gray-500/20">
                    Not required
                  </span>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">Error: {error}</p>}

      <p className="mt-3 text-xs text-gray-400">
        Changes are saved automatically.
      </p>
    </div>
  );
}
