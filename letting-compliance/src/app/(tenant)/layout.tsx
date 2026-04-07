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

  // 2. Verify the user's email matches a tenancy record
  const admin = createAdminClient();
  const { data: tenancy } = await admin
    .from("property_tenants")
    .select("id, property_id, lead_tenant_name")
    .eq("lead_tenant_email", user.email ?? "")
    .maybeSingle();

  if (!tenancy) {
    redirect("/portal-login?message=no-tenancy");
  }

  return (
    <TenantShell userEmail={user.email ?? ""} tenantName={tenancy.lead_tenant_name ?? ""}>
      {children}
    </TenantShell>
  );
}
