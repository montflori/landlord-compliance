import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatCurrency(n: number | null) {
  if (!n) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
}

// ─── Detail row ───────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <span className="text-sm text-slate-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-900 text-right">{value || "—"}</span>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</h2>
      </div>
      <div className="divide-y divide-slate-100 px-5">
        {children}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TenantPropertyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal-login");

  const admin = createAdminClient();

  // auth_user_id first, email fallback for pre-accept tenants
  const tenancySelect = `
    id,
    property_id,
    lead_tenant_name,
    lead_tenant_email,
    lead_tenant_phone,
    additional_tenants,
    tenancy_start_date,
    tenancy_end_date,
    monthly_rent,
    deposit_amount,
    notes,
    properties (
      id,
      address_line_1,
      address_line_2,
      city,
      postcode,
      property_type,
      bedrooms,
      occupancy_status,
      landlords ( full_name, email, phone )
    )
  `;

  const { data: byUserId } = await admin
    .from("property_tenants")
    .select(tenancySelect)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  let tenancy = byUserId ?? null;

  if (tenancy) {
    console.log("[portal property] tenancy lookup: auth_user_id");
  } else {
    console.log("[portal property] tenancy lookup: email fallback");
    const { data: byEmail } = await admin
      .from("property_tenants")
      .select(tenancySelect)
      .eq("lead_tenant_email", user.email ?? "")
      .maybeSingle();
    tenancy = byEmail ?? null;
  }

  if (!tenancy) redirect("/portal-login?message=no-tenancy");

  const property = Array.isArray(tenancy.properties) ? tenancy.properties[0] : tenancy.properties;
  const landlord = property
    ? Array.isArray(property.landlords)
      ? property.landlords[0]
      : (property.landlords as { full_name: string; email: string; phone: string | null } | null)
    : null;

  const fullAddress = [
    property?.address_line_1,
    property?.address_line_2,
    property?.city,
    property?.postcode,
  ]
    .filter(Boolean)
    .join("\n");

  const additionalTenants = tenancy.additional_tenants
    ? tenancy.additional_tenants
        .split(",")
        .map((t: string) => t.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <Link
          href="/portal"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-700"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
          </svg>
          Back to home
        </Link>
        <h1 className="text-xl font-semibold text-slate-900">Your property</h1>
        <p className="mt-1 text-sm text-slate-500">Details about your rental property and tenancy.</p>
      </div>

      {/* ── Property address hero ──────────────────────────────────────────── */}
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
            <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205 3 1m1.5.5-1.5-.5M6.75 7.364V3h-3v18m3-13.636 10.5-3.819" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-900">{property?.address_line_1}</p>
            {(property?.address_line_2 || property?.city) && (
              <p className="text-sm text-slate-500">
                {[property?.address_line_2, property?.city, property?.postcode]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {property?.property_type && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {property.property_type}
                </span>
              )}
              {property?.bedrooms && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {property.bedrooms} bedroom{property.bedrooms !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">

        {/* ── Tenancy details ────────────────────────────────────────────────── */}
        <Section title="Tenancy details">
          <DetailRow label="Start date" value={formatDate(tenancy.tenancy_start_date)} />
          <DetailRow label="End date" value={formatDate(tenancy.tenancy_end_date)} />
          <DetailRow label="Monthly rent" value={formatCurrency(tenancy.monthly_rent)} />
          <DetailRow label="Deposit" value={formatCurrency(tenancy.deposit_amount)} />
        </Section>

        {/* ── Tenants ────────────────────────────────────────────────────────── */}
        <Section title="Tenants">
          <DetailRow label="Lead tenant" value={tenancy.lead_tenant_name || user.email} />
          <DetailRow label="Email" value={tenancy.lead_tenant_email} />
          <DetailRow label="Phone" value={tenancy.lead_tenant_phone} />
          {additionalTenants.length > 0 && (
            <DetailRow
              label="Additional tenants"
              value={additionalTenants.join(", ")}
            />
          )}
        </Section>

        {/* ── Letting agent / landlord ────────────────────────────────────── */}
        {landlord && (
          <Section title="Your letting agent">
            <DetailRow label="Name" value={landlord.full_name} />
            <DetailRow
              label="Email"
              value={
                <a href={`mailto:${landlord.email}`} className="text-indigo-600 hover:underline">
                  {landlord.email}
                </a>
              }
            />
            {landlord.phone && (
              <DetailRow
                label="Phone"
                value={
                  <a href={`tel:${landlord.phone}`} className="text-indigo-600 hover:underline">
                    {landlord.phone}
                  </a>
                }
              />
            )}
          </Section>
        )}

        {/* ── Notes ──────────────────────────────────────────────────────────── */}
        {tenancy.notes && (
          <Section title="Notes">
            <div className="py-3.5">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{tenancy.notes}</p>
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}
