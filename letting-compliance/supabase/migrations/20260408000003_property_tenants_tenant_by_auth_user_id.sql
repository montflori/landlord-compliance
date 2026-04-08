-- Allow tenants to SELECT their own tenancy row by auth_user_id.
-- This is the primary lookup path once a tenant has accepted their invite
-- and auth_user_id is written. Complements the existing email-based policy
-- which remains as the fallback for tenants who have not yet accepted.

DROP POLICY IF EXISTS "property_tenants_select_tenant_by_auth_user_id" ON property_tenants;

CREATE POLICY "property_tenants_select_tenant_by_auth_user_id"
  ON property_tenants
  FOR SELECT
  USING (auth_user_id = auth.uid());
