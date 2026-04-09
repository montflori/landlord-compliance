import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

type ComplianceRecord = {
  id: string;
  compliance_type_id: string;
  expiry_date: string | null;
  issue_date: string | null;
  document_url: string | null;
};

type ComplianceType = {
  id: string;
  code: string;
  name: string;
};

type ComputedStatus = "valid" | "expiring_soon" | "expired" | "missing";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeStatus(record: ComplianceRecord | null): ComputedStatus {
  if (!record) return "missing";
  if (!record.expiry_date) return "valid";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(record.expiry_date);
  if (expiry < today) return "expired";
  const in30 = new Date(today);
  in30.setDate(today.getDate() + 30);
  if (expiry <= in30) return "expiring_soon";
  return "valid";
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ComputedStatus, { label: string; classes: string }> = {
  valid: { label: "Up to date", classes: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  expiring_soon: { label: "Expiring soon", classes: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  expired: { label: "Expired", classes: "bg-red-50 text-red-700 ring-red-600/20" },
  missing: { label: "Not uploaded", classes: "bg-slate-100 text-slate-600 ring-slate-500/20" },
};

function StatusBadge({ status }: { status: ComputedStatus }) {
  const { label, classes } = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${classes}`}>
      {label}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TenantDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal-login");

  const admin = createAdminClient();

  // Fetch tenancy + property — auth_user_id first, email fallback for pre-accept tenants
  const tenancySelect = `
    id,
    property_id,
    lead_tenant_name,
    tenancy_start_date,
    tenancy_end_date,
    monthly_rent,
    properties (
      id,
      address_line_1,
      address_line_2,
      city,
      postcode,
      property_type,
      bedrooms,
      landlords ( full_name )
    )
  `;

  const { data: byUserId } = await admin
    .from("property_tenants")
    .select(tenancySelect)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  let tenancy = byUserId ?? null;

  if (tenancy) {
    console.log("[portal dashboard] tenancy lookup: auth_user_id");
  } else {
    console.log("[portal dashboard] tenancy lookup: email fallback");
    const { data: byEmail } = await admin
      .from("property_tenants")
      .select(tenancySelect)
      .eq("lead_tenant_email", user.email ?? "")
      .maybeSingle();
    tenancy = byEmail ?? null;
  }

  if (!tenancy) redirect("/portal-login?message=no-tenancy");

  const property = Array.isArray(tenancy.properties) ? tenancy.properties[0] : tenancy.properties;

  // Fetch required compliance types + records for this property
  const { data: requirements } = await admin
    .from("property_compliance_requirements")
    .select("compliance_type_id, is_required, compliance_types(id, code, name)")
    .eq("property_id", tenancy.property_id)
    .eq("is_required", true);

  const { data: records } = await admin
    .from("compliance_records")
    .select("id, compliance_type_id, expiry_date, issue_date, document_url")
    .eq("property_id", tenancy.property_id);

  const recordMap = new Map<string, ComplianceRecord>(
    (records ?? []).map((r) => [r.compliance_type_id, r])
  );

  const complianceItems = (requirements ?? []).map((req) => {
    const ct = Array.isArray(req.compliance_types) ? req.compliance_types[0] : req.compliance_types;
    const record = recordMap.get(req.compliance_type_id) ?? null;
    return { type: ct as ComplianceType, record, status: computeStatus(record) };
  });

  const validCount = complianceItems.filter((i) => i.status === "valid").length;
  const actionRequired = complianceItems.filter(
    (i) => i.status === "expired" || i.status === "expiring_soon"
  ).length;

  // Fetch uploaded doc count
  const { count: docCount } = await admin
    .from("tenant_documents")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenancy.id);

  const addressLine = [
    property?.address_line_1,
    property?.address_line_2,
    property?.city,
    property?.postcode,
  ]
    .filter(Boolean)
    .join(", ");

  const landlordName = property
    ? Array.isArray(property.landlords)
      ? property.landlords[0]?.full_name
      : (property.landlords as { full_name: string } | null)?.full_name
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">

      {/* ── Greeting ─────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">
          Hello{tenancy.lead_tenant_name ? `, ${tenancy.lead_tenant_name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Here&apos;s a summary of your tenancy.
        </p>
      </div>

      {/* ── Property card ─────────────────────────────────────────────────── */}
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
              <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205 3 1m1.5.5-1.5-.5M6.75 7.364V3h-3v18m3-13.636 10.5-3.819" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-slate-900">{property?.address_line_1}</p>
              {(property?.address_line_2 || property?.city) && (
                <p className="text-sm text-slate-500">
                  {[property?.address_line_2, property?.city, property?.postcode]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
              {landlordName && (
                <p className="mt-1 text-xs text-slate-400">Managed by {landlordName}</p>
              )}
            </div>
          </div>
          <Link
            href="/portal/property"
            className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
          >
            View details
          </Link>
        </div>

        {/* Tenancy dates */}
        {(tenancy.tenancy_start_date || tenancy.tenancy_end_date) && (
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
            <div>
              <p className="text-xs text-slate-400">Tenancy start</p>
              <p className="mt-0.5 text-sm font-medium text-slate-700">
                {formatDate(tenancy.tenancy_start_date)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Tenancy end</p>
              <p className="mt-0.5 text-sm font-medium text-slate-700">
                {formatDate(tenancy.tenancy_end_date)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Quick stats ───────────────────────────────────────────────────── */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Certificates</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{complianceItems.length}</p>
          <p className="text-xs text-slate-400">required</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Up to date</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600">{validCount}</p>
          <p className="text-xs text-slate-400">compliant</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Your docs</p>
          <p className="mt-1 text-2xl font-semibold text-indigo-600">{docCount ?? 0}</p>
          <p className="text-xs text-slate-400">uploaded</p>
        </div>
      </div>

      {/* ── Action required banner ────────────────────────────────────────── */}
      {actionRequired > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800">
              {actionRequired} certificate{actionRequired > 1 ? "s" : ""}{" "}
              {actionRequired > 1 ? "need" : "needs"} attention
            </p>
            <p className="mt-0.5 text-xs text-amber-700">
              Your letting agent will be in touch. No action needed from you.
            </p>
          </div>
        </div>
      )}

      {/* ── Compliance list ───────────────────────────────────────────────── */}
      <div className="mb-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Property certificates</h2>

        {complianceItems.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <svg className="mx-auto mb-3 h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
            <p className="text-sm text-slate-500">No certificates set up yet.</p>
            <p className="mt-1 text-xs text-slate-400">Your letting agent will add them shortly.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {complianceItems.map(({ type, record, status }) => (
              <div key={type.id} className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                    status === "valid" ? "bg-emerald-400" :
                    status === "expiring_soon" ? "bg-amber-400" :
                    status === "expired" ? "bg-red-400" : "bg-slate-300"
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{type.name}</p>
                    {record?.expiry_date && (
                      <p className="text-xs text-slate-400">
                        {status === "expired" ? "Expired" : "Expires"}{" "}
                        {formatDate(record.expiry_date)}
                      </p>
                    )}
                  </div>
                </div>
                <StatusBadge status={status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Documents CTA ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-indigo-900">Upload documents</p>
            <p className="mt-0.5 text-xs text-indigo-700">
              Share tenancy agreements, ID, or any documents your agent has requested.
            </p>
          </div>
          <Link
            href="/portal/documents"
            className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            Go to documents
          </Link>
        </div>
      </div>
    </div>
  );
}
