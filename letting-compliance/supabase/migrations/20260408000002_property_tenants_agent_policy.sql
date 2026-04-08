-- Add agent-facing SELECT policy on property_tenants.
--
-- The v2 migration enabled RLS on property_tenants with only tenant-facing
-- SELECT policies, which broke the agent property detail page. Agents need
-- to be able to read tenant rows for properties they manage.

DROP POLICY IF EXISTS "property_tenants_select_agent" ON property_tenants;

CREATE POLICY "property_tenants_select_agent"
  ON property_tenants
  FOR SELECT
  USING (
    property_id IN (
      SELECT p.id
      FROM properties p
      JOIN landlords l ON l.id = p.landlord_id
      WHERE l.user_id = auth.uid()
    )
  );
