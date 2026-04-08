-- Add portal_activated_at to property_tenants.
--
-- Tracks when a tenant has successfully completed portal account setup
-- (i.e. set their password after accepting an invite or clicking a recovery link).
-- NULL means the tenant has not yet activated their portal access.
-- The tenant portal layout gates full access on this column being non-null.

ALTER TABLE property_tenants
  ADD COLUMN IF NOT EXISTS portal_activated_at timestamptz;
