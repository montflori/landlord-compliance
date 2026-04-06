import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// ─── Types ────────────────────────────────────────────────────────────────────

type CoveredRecord = {
  property_id: string;
  compliance_type_id: string;
};

type MissingItem = {
  id: string;
  property_id: string;
  address_line_1: string;
  city: string;
  postcode: string;
  missing_item_name: string;
};

type ExpiringItem = {
  id: string;
  property_id: string;
  address_line_1: string;
  city: string;
  postcode: string;
  compliance_type_name: string;
  expiry_date: string;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { count: landlordCount },
    { count: propertyCount },
    { data: recentProperties },
    { data: requiredItemsRaw },
    { data: recordsRaw },
    { data: expiringRaw },
  ] = await Promise.all([
    supabase.from("landlords").select("*", { count: "exact", head: true }),
    supabase.from("properties").select("*", { count: "exact", head: true }),
    supabase
      .from("properties")
      .select("id, address_line_1, city, postcode, created_at, landlords(full_name)")
      .order("created_at", { ascending: false })
      .limit(5),
    // Single query — both joins driven from requirements using FK hints.
    // Avoids a direct compliance_types query which may be blocked by RLS.
    supabase
      .from("property_compliance_requirements")
      .select(
        "id, property_id, compliance_type_id, compliance_types!compliance_type_id(name), properties!property_id(address_line_1, city, postcode)"
      )
      .eq("is_required", true),
    supabase
      .from("compliance_records")
      .select("property_id, compliance_type_id"),
    supabase
      .from("compliance_records")
      .select(
        "id, property_id, compliance_type_id, expiry_date, properties!property_id(address_line_1, city, postcode), compliance_types!compliance_type_id(name)"
      )
      .gte("expiry_date", new Date().toISOString().slice(0, 10))
      .lte(
        "expiry_date",
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      )
      .order("expiry_date", { ascending: true }),
  ]);

  const records = ((recordsRaw ?? []) as unknown as CoveredRecord[]);

  // Set of "property_id::compliance_type_id" keys that already have a record
  const covered = new Set(
    records.map((r) => `${r.property_id}::${r.compliance_type_id}`)
  );

  // Flatten each required row into MissingItem, extracting joined fields defensively.
  // PostgREST may return joined relations as an object or single-element array.
  const missingItems: MissingItem[] = ((requiredItemsRaw ?? []) as any[])
    .filter((row) => !covered.has(`${row.property_id}::${row.compliance_type_id}`))
    .map((row) => {
      const ct = Array.isArray(row.compliance_types) ? row.compliance_types[0] : row.compliance_types;
      const prop = Array.isArray(row.properties) ? row.properties[0] : row.properties;
      return {
        id: row.id as string,
        property_id: row.property_id as string,
        address_line_1: (prop?.address_line_1 ?? "") as string,
        city: (prop?.city ?? "") as string,
        postcode: (prop?.postcode ?? "") as string,
        missing_item_name: (ct?.name ?? "") as string,
      };
    });

  const expiringItems: ExpiringItem[] = ((expiringRaw ?? []) as any[]).map((row) => {
    const ct = Array.isArray(row.compliance_types) ? row.compliance_types[0] : row.compliance_types;
    const prop = Array.isArray(row.properties) ? row.properties[0] : row.properties;
    return {
      id: row.id as string,
      property_id: row.property_id as string,
      address_line_1: (prop?.address_line_1 ?? "") as string,
      city: (prop?.city ?? "") as string,
      postcode: (prop?.postcode ?? "") as string,
      compliance_type_name: (ct?.name ?? "") as string,
      expiry_date: row.expiry_date as string,
    };
  });

  // Group expiring items by property
  const expiringByProperty = new Map<string, { address: string; items: ExpiringItem[] }>();
  for (const item of expiringItems) {
    if (!expiringByProperty.has(item.property_id)) {
      expiringByProperty.set(item.property_id, {
        address: [item.address_line_1, item.city, item.postcode].filter(Boolean).join(", "),
        items: [],
      });
    }
    expiringByProperty.get(item.property_id)!.items.push(item);
  }

  const totalRequired = requiredItemsRaw?.length ?? 0;
  const totalMissing = missingItems.length;
  const recentMissing = missingItems.slice(0, 5);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-500">
        Overview of your compliance status
      </p>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Landlords", value: landlordCount ?? 0 },
          { label: "Total Properties", value: propertyCount ?? 0 },
          { label: "Required Items", value: totalRequired },
          { label: "Missing Items", value: totalMissing, danger: totalMissing > 0 },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-5"
          >
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p
              className={`mt-1 text-3xl font-semibold ${
                stat.danger ? "text-red-600" : "text-gray-900"
              }`}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Expiring soon */}
      <div className="mt-8">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">
          Expiring in the next 30 days
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white">
          {expiringByProperty.size === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-400">
              No compliance records expiring in the next 30 days.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {Array.from(expiringByProperty.entries()).map(([propertyId, { address, items }]) => (
                <div key={propertyId} className="px-5 py-4">
                  <Link
                    href={`/properties/${propertyId}`}
                    className="text-sm font-medium text-gray-900 hover:text-indigo-600"
                  >
                    {address}
                  </Link>
                  <ul className="mt-2 space-y-1">
                    {items.map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-4">
                        <span className="text-sm text-gray-600">{item.compliance_type_name || "—"}</span>
                        <span className="shrink-0 text-xs font-medium text-amber-700">
                          Expires {formatDate(item.expiry_date)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent properties */}
        <div>
          <h2 className="mb-4 text-sm font-semibold text-gray-900">
            Recent properties
          </h2>
          <div className="rounded-xl border border-gray-200 bg-white">
            {!recentProperties || recentProperties.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-sm text-gray-400">
                No properties yet.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-3">Address</th>
                    <th className="px-5 py-3">Landlord</th>
                    <th className="px-5 py-3">Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentProperties.map((property) => {
                    const landlord = Array.isArray(property.landlords)
                      ? property.landlords[0]
                      : property.landlords;
                    return (
                      <tr key={property.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3">
                          <Link
                            href={`/properties/${property.id}`}
                            className="font-medium text-gray-900 hover:text-indigo-600"
                          >
                            {property.address_line_1}
                          </Link>
                          <p className="text-xs text-gray-500">
                            {property.city}, {property.postcode}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {landlord?.full_name ?? "—"}
                        </td>
                        <td className="px-5 py-3 text-gray-500">
                          {formatDate(property.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent missing compliance items */}
        <div>
          <h2 className="mb-4 text-sm font-semibold text-gray-900">
            Recent missing compliance items
          </h2>
          <div className="rounded-xl border border-gray-200 bg-white">
            {recentMissing.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-sm text-gray-400">
                All required items are covered.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-3">Property</th>
                    <th className="px-5 py-3">Missing item</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentMissing.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        {item.address_line_1 ? (
                          <>
                            <Link
                              href={`/properties/${item.property_id}`}
                              className="font-medium text-gray-900 hover:text-indigo-600"
                            >
                              {item.address_line_1}
                            </Link>
                            <p className="text-xs text-gray-500">
                              {item.city}, {item.postcode}
                            </p>
                          </>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                          {item.missing_item_name || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
