import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// ─── Types ────────────────────────────────────────────────────────────────────

type Landlord = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
};

type Property = {
  id: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  postcode: string;
  property_type: string;
  bedrooms: number;
};

type ComplianceStat = { required: number; covered: number };

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
          className={`h-1.5 rounded-full ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LandlordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: landlord } = await supabase
    .from("landlords")
    .select("id, full_name, email, phone")
    .eq("id", id)
    .single();

  if (!landlord) notFound();

  const { data: propertiesRaw } = await supabase
    .from("properties")
    .select("id, address_line_1, address_line_2, city, postcode, property_type, bedrooms")
    .eq("landlord_id", id)
    .order("address_line_1", { ascending: true });

  const properties = (propertiesRaw ?? []) as Property[];
  const propertyIds = properties.map((p) => p.id);

  // Only query compliance tables if there are properties
  let reqData: { property_id: string; compliance_type_id: string }[] = [];
  let recordData: { property_id: string; compliance_type_id: string }[] = [];

  if (propertyIds.length > 0) {
    const [{ data: req }, { data: rec }] = await Promise.all([
      supabase
        .from("property_compliance_requirements")
        .select("property_id, compliance_type_id")
        .eq("is_required", true)
        .in("property_id", propertyIds),
      supabase
        .from("compliance_records")
        .select("property_id, compliance_type_id")
        .in("property_id", propertyIds),
    ]);
    reqData = req ?? [];
    recordData = rec ?? [];
  }

  // Build per-property compliance stats
  const requiredByProperty = new Map<string, Set<string>>();
  for (const row of reqData) {
    if (!requiredByProperty.has(row.property_id)) {
      requiredByProperty.set(row.property_id, new Set());
    }
    requiredByProperty.get(row.property_id)!.add(row.compliance_type_id);
  }

  const coveredByProperty = new Map<string, Set<string>>();
  for (const row of recordData) {
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

  return (
    <div className="p-8">
      {/* Back link */}
      <Link
        href="/landlords"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
        </svg>
        Back to landlords
      </Link>

      {/* Landlord header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-lg font-semibold text-indigo-700 select-none">
            {(landlord as Landlord).full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {(landlord as Landlord).full_name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
              <a
                href={`mailto:${(landlord as Landlord).email}`}
                className="flex items-center gap-1.5 hover:text-gray-700"
              >
                <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" />
                  <path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" />
                </svg>
                {(landlord as Landlord).email}
              </a>
              {(landlord as Landlord).phone && (
                <a
                  href={`tel:${(landlord as Landlord).phone}`}
                  className="flex items-center gap-1.5 hover:text-gray-700"
                >
                  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.223a1.5 1.5 0 0 1-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 0 0 6.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 0 1 1.767-1.052l3.223.716A1.5 1.5 0 0 1 18 16.352V17.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 8.326 13.019 13.019 0 0 1 2 5V3.5Z" clipRule="evenodd" />
                  </svg>
                  {(landlord as Landlord).phone}
                </a>
              )}
            </div>
          </div>
        </div>
        <Link
          href={`/landlords/${id}/edit`}
          className="shrink-0 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Edit landlord
        </Link>
      </div>

      {/* Properties */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            Properties
            {properties.length > 0 && (
              <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {properties.length}
              </span>
            )}
          </h2>
          <Link
            href="/properties"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            View all properties →
          </Link>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white">
          {properties.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-gray-400">No properties linked to this landlord.</p>
              <Link
                href="/properties"
                className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                Add a property →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {properties.map((property) => {
                const stat = stats.get(property.id);
                return (
                  <li key={property.id} className="flex items-center gap-6 px-6 py-4 hover:bg-gray-50">
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
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
