import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import TenantShell from "./_components/TenantShell";

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Verify the user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/portal-login");
  }

  // 2. Resolve tenancy — auth_user_id first (post-invite-accept), email fallback (legacy / pre-accept)
  const admin = createAdminClient();

  const { data: byUserId } = await admin
    .from("property_tenants")
    .select("id, property_id, lead_tenant_name, portal_activated_at")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  let tenancy = byUserId ?? null;

  if (tenancy) {
    console.log("[portal layout] tenancy lookup: auth_user_id");
  } else {
    console.log("[portal layout] tenancy lookup: email fallback");
    const { data: byEmail } = await admin
      .from("property_tenants")
      .select("id, property_id, lead_tenant_name, portal_activated_at")
      .eq("lead_tenant_email", user.email ?? "")
      .maybeSingle();
    tenancy = byEmail ?? null;
  }

  if (!tenancy) {
    redirect("/portal-login?message=no-tenancy");
  }

  // Gate: tenant must have completed password setup before accessing the portal.
  if (!tenancy.portal_activated_at) {
    console.log(`[portal layout] tenancy not yet activated — redirecting to setup: propertyTenantId=${tenancy.id}`);
    redirect("/portal-login?message=setup-required");
  }

  return (
    <TenantShell userEmail={user.email ?? ""} tenantName={tenancy.lead_tenant_name ?? ""}>
      {children}
    </TenantShell>
  );
}
