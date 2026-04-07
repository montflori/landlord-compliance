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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

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

  const covered = new Set(
    records.map((r) => `${r.property_id}::${r.compliance_type_id}`)
  );

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

  const complianceScore =
    totalRequired > 0
      ? Math.round(((totalRequired - totalMissing) / totalRequired) * 100)
      : 100;

  const stats = [
    {
      label: "Landlords",
      value: landlordCount ?? 0,
      href: "/landlords",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
        </svg>
      ),
      accent: "text-slate-600",
      bg: "bg-slate-100",
    },
    {
      label: "Properties",
      value: propertyCount ?? 0,
      href: "/properties",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
      accent: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "Required items",
      value: totalRequired,
      href: "/compliance",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
        </svg>
      ),
      accent: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Missing items",
      value: totalMissing,
      href: "/compliance",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      ),
      accent: totalMissing > 0 ? "text-red-600" : "text-emerald-600",
      bg: totalMissing > 0 ? "bg-red-50" : "bg-emerald-50",
      danger: totalMissing > 0,
    },
  ];

  return (
    <div className="flex flex-col min-h-full">
      {/* Page header */}
      <div className="border-b border-gray-200 bg-white px-4 py-5 sm:px-8 sm:py-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">Dashboard</h1>
            <p className="mt-0.5 text-sm text-gray-500">Compliance overview across your portfolio</p>
          </div>
          {totalRequired > 0 && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-gray-500">Compliance score</p>
                <p className={`text-lg font-semibold ${complianceScore >= 90 ? "text-emerald-600" : complianceScore >= 70 ? "text-amber-600" : "text-red-600"}`}>
                  {complianceScore}%
                </p>
              </div>
              <div className="h-10 w-10 rounded-full border-4 border-gray-100 flex items-center justify-center"
                style={{
                  background: `conic-gradient(${complianceScore >= 90 ? "#059669" : complianceScore >= 70 ? "#d97706" : "#dc2626"} ${complianceScore * 3.6}deg, #f3f4f6 0deg)`,
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-8 space-y-6 sm:space-y-8">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="group rounded-xl border border-gray-200 bg-white p-5 transition hover:border-gray-300 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{stat.label}</p>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg} ${stat.accent}`}>
                  {stat.icon}
                </div>
              </div>
              <p className={`mt-3 text-3xl font-semibold tabular-nums ${stat.danger ? "text-red-600" : "text-gray-900"}`}>
                {stat.value}
              </p>
            </Link>
          ))}
        </div>

        {/* Expiring soon */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Expiring in the next 30 days</h2>
              <p className="mt-0.5 text-xs text-gray-400">Compliance records requiring renewal</p>
            </div>
            {expiringByProperty.size > 0 && (
              <Link href="/compliance" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                View all →
              </Link>
            )}
          </div>
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            {expiringByProperty.size === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                  <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-700">All clear</p>
                <p className="text-xs text-gray-400">No records expiring in the next 30 days</p>
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
                    <ul className="mt-2.5 space-y-1.5">
                      {items.map((item) => {
                        const days = daysUntil(item.expiry_date);
                        return (
                          <li key={item.id} className="flex items-center justify-between gap-4">
                            <span className="text-sm text-gray-600">{item.compliance_type_name || "—"}</span>
                            <span className={`shrink-0 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                              days <= 7
                                ? "bg-red-50 text-red-700 ring-red-600/20"
                                : "bg-amber-50 text-amber-700 ring-amber-600/20"
                            }`}>
                              {days <= 0 ? "Today" : `${days}d · ${formatDate(item.expiry_date)}`}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent properties */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Recent properties</h2>
                <p className="mt-0.5 text-xs text-gray-400">Latest additions to your portfolio</p>
              </div>
              <Link href="/properties" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                View all →
              </Link>
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              {!recentProperties || recentProperties.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-700">No properties yet</p>
                  <Link href="/properties" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                    Add your first property →
                  </Link>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <table className="hidden sm:table w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Address</th>
                        <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Landlord</th>
                        <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Added</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {recentProperties.map((property) => {
                        const landlord = Array.isArray(property.landlords) ? property.landlords[0] : property.landlords;
                        return (
                          <tr key={property.id} className="hover:bg-gray-50/60 transition-colors">
                            <td className="px-5 py-3.5">
                              <Link href={`/properties/${property.id}`} className="font-medium text-gray-900 hover:text-indigo-600">{property.address_line_1}</Link>
                              <p className="text-xs text-gray-400 mt-0.5">{property.city}, {property.postcode}</p>
                            </td>
                            <td className="px-5 py-3.5 text-gray-500">{landlord?.full_name ?? "—"}</td>
                            <td className="px-5 py-3.5 text-gray-400 tabular-nums">{formatDate(property.created_at)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {/* Mobile card list */}
                  <div className="sm:hidden divide-y divide-gray-100">
                    {recentProperties.map((property) => (
                        <Link key={property.id} href={`/properties/${property.id}`} className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{property.address_line_1}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{property.city}, {property.postcode}</p>
                          </div>
                          <svg className="h-4 w-4 shrink-0 text-gray-300 ml-3" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                          </svg>
                        </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Missing compliance items */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Missing compliance items</h2>
                <p className="mt-0.5 text-xs text-gray-400">Required items with no record on file</p>
              </div>
              {recentMissing.length > 0 && (
                <Link href="/compliance" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                  View all →
                </Link>
              )}
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              {recentMissing.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                    <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-700">Fully covered</p>
                  <p className="text-xs text-gray-400">All required compliance items are on file</p>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <table className="hidden sm:table w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Property</th>
                        <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Missing item</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {recentMissing.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-5 py-3.5">
                            {item.address_line_1 ? (
                              <>
                                <Link href={`/properties/${item.property_id}`} className="font-medium text-gray-900 hover:text-indigo-600">{item.address_line_1}</Link>
                                <p className="text-xs text-gray-400 mt-0.5">{item.city}, {item.postcode}</p>
                              </>
                            ) : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">{item.missing_item_name || "—"}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Mobile card list */}
                  <div className="sm:hidden divide-y divide-gray-100">
                    {recentMissing.map((item) => (
                      <Link key={item.id} href={`/properties/${item.property_id}`} className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{item.address_line_1 || "—"}</p>
                          <span className="mt-1 inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">{item.missing_item_name || "—"}</span>
                        </div>
                        <svg className="h-4 w-4 shrink-0 text-gray-300 ml-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                        </svg>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
