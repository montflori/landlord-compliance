-- ============================================================
-- Tenant Portal v2 Migration
-- Run this in your Supabase SQL editor.
--
-- Depends on: 20260101000000_tenant_portal.sql (must be applied first)
--
-- DO NOT run the backfill migration (20260408000001) until you have
-- reviewed the preview query and confirmed the matches are correct.
-- ============================================================


-- ── Section 1: tenant_invites ─────────────────────────────────────────────────
--
-- Tracks the full lifecycle of a tenant portal invitation.
--
-- Token security model:
--   The API generates a cryptographically random raw token (e.g. 32 random bytes,
--   hex-encoded), sends it in the invite URL, and stores only the SHA-256 hash
--   here. Hashing is done in the application layer (Node.js crypto.createHash).
--   The DB never holds a recoverable token — a compromised DB cannot be used to
--   forge invite URLs.
--
-- Resend behaviour:
--   Resending an invite must happen inside a single transaction in the API route:
--     1. UPDATE the existing pending row to status = 'expired'.
--     2. INSERT a new row with a fresh token_hash and expires_at.
--   The unique partial index below rejects any attempt to have two pending rows
--   for the same tenant, enforcing the one-pending-per-tenant rule at the DB level.
--
-- Expiry:
--   expires_at defaults to 7 days from creation. The accept API route rejects
--   tokens where expires_at < now() even if status is still 'pending'. No
--   scheduled job or trigger is needed — expiry is checked at lookup time.

CREATE TABLE tenant_invites (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_tenant_id   uuid        NOT NULL
                                   REFERENCES property_tenants(id) ON DELETE CASCADE,
  email                text        NOT NULL,  -- denormalised from property_tenants for fast lookup
  token_hash           text        NOT NULL,  -- SHA-256(raw_token), hex-encoded, application-computed
  status               text        NOT NULL DEFAULT 'pending'
                                   CHECK (status IN ('pending', 'accepted', 'expired')),
  invited_by_user_id   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  expires_at           timestamptz NOT NULL DEFAULT now() + interval '7 days',
  accepted_at          timestamptz,

  CONSTRAINT tenant_invites_accepted_at_requires_accepted
    CHECK (accepted_at IS NULL OR status = 'accepted')
);

-- Exactly one pending invite per tenant at a time.
-- The resend flow must expire the old row before inserting a new one.
CREATE UNIQUE INDEX IF NOT EXISTS tenant_invites_one_pending_per_tenant
  ON tenant_invites(property_tenant_id)
  WHERE (status = 'pending');

-- Fast lookup when a tenant submits their raw token (hashed client-side before query).
CREATE INDEX IF NOT EXISTS tenant_invites_token_hash_idx
  ON tenant_invites(token_hash);

CREATE INDEX IF NOT EXISTS tenant_invites_property_tenant_id_idx
  ON tenant_invites(property_tenant_id);


-- ── Section 2: document_requests ─────────────────────────────────────────────
--
-- An agent-created request asking a specific tenant to supply a named document.
--
-- Completion criterion:
--   status transitions to 'fulfilled' ONLY when a tenant_documents row that
--   references this request via document_request_id has review_status = 'approved'.
--   A bare upload (review_status = 'pending') does NOT fulfil the request.
--   This transition is enforced in the review API route, not by a DB trigger,
--   keeping all business logic in one auditable place.

CREATE TABLE document_requests (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_tenant_id     uuid        NOT NULL
                                     REFERENCES property_tenants(id) ON DELETE CASCADE,
  property_id            uuid        NOT NULL
                                     REFERENCES properties(id) ON DELETE CASCADE,
  requested_by_user_id   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  title                  text        NOT NULL,
  description            text,
  due_date               date,
  status                 text        NOT NULL DEFAULT 'pending'
                                     CHECK (status IN ('pending', 'fulfilled', 'cancelled')),
  created_at             timestamptz NOT NULL DEFAULT now(),
  fulfilled_at           timestamptz,

  CONSTRAINT document_requests_fulfilled_at_requires_fulfilled
    CHECK (fulfilled_at IS NULL OR status = 'fulfilled')
);

CREATE INDEX IF NOT EXISTS document_requests_property_tenant_id_idx
  ON document_requests(property_tenant_id);

CREATE INDEX IF NOT EXISTS document_requests_property_id_idx
  ON document_requests(property_id);


-- ── Section 3: Alter property_tenants ────────────────────────────────────────
--
-- auth_user_id is the proper identity link between auth.users and a tenancy row.
-- It starts NULL and is written by the accept-invite API route once the tenant
-- sets their password.
--
-- The portal layout uses this column as the primary lookup once the backfill
-- migration has run. Until then it falls back to lead_tenant_email matching
-- (the existing RLS policy "property_tenants_select_by_email" covers this).

ALTER TABLE property_tenants
  ADD COLUMN IF NOT EXISTS auth_user_id uuid
    REFERENCES auth.users(id) ON DELETE SET NULL;

-- Sparse index: only rows where the link has been established.
CREATE INDEX IF NOT EXISTS property_tenants_auth_user_id_idx
  ON property_tenants(auth_user_id)
  WHERE auth_user_id IS NOT NULL;


-- ── Section 4: Alter tenant_documents ────────────────────────────────────────
--
-- review_status, review_note, and the reviewer FK support the agent review flow.
-- document_request_id links an upload to a specific request so the fulfilment
-- check (section 2 above) knows which request to close out when a doc is approved.
--
-- Column-level enforcement note:
--   There is NO RLS UPDATE policy for agents on this table.
--   review_status, review_note, reviewed_by_user_id, and reviewed_at may only
--   be written through the /api/tenant-documents/[id]/review route, which uses
--   the service role key. This keeps all review logic in one auditable endpoint
--   rather than relying on column-level RLS (which Postgres does not natively
--   support — any UPDATE policy would allow agents to modify any column).

ALTER TABLE tenant_documents
  ADD COLUMN IF NOT EXISTS review_status       text        NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS review_note         text,
  ADD COLUMN IF NOT EXISTS reviewed_by_user_id uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at         timestamptz,
  ADD COLUMN IF NOT EXISTS document_request_id uuid        REFERENCES document_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tenant_documents_document_request_id_idx
  ON tenant_documents(document_request_id)
  WHERE document_request_id IS NOT NULL;


-- ── Section 5: RLS — tenant_invites ──────────────────────────────────────────
--
-- Tenants do not query this table directly; the accept flow goes through the
-- API route which uses the service role. Agents can read invite status for
-- properties they manage.
--
-- No INSERT, UPDATE, or DELETE policies are defined for authenticated clients —
-- all mutations go through service role API routes.

ALTER TABLE tenant_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_invites_select_agent"
  ON tenant_invites FOR SELECT
  USING (
    property_tenant_id IN (
      SELECT pt.id
      FROM   property_tenants pt
      JOIN   properties       p  ON p.id = pt.property_id
      JOIN   landlords        l  ON l.id = p.landlord_id
      WHERE  l.user_id = auth.uid()
    )
  );


-- ── Section 6: RLS — document_requests ───────────────────────────────────────

ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;

-- Agents: full read/write for their portfolio
CREATE POLICY "document_requests_select_agent"
  ON document_requests FOR SELECT
  USING (
    property_id IN (
      SELECT p.id FROM properties p
      JOIN   landlords l ON l.id = p.landlord_id
      WHERE  l.user_id = auth.uid()
    )
  );

CREATE POLICY "document_requests_insert_agent"
  ON document_requests FOR INSERT
  WITH CHECK (
    property_id IN (
      SELECT p.id FROM properties p
      JOIN   landlords l ON l.id = p.landlord_id
      WHERE  l.user_id = auth.uid()
    )
  );

CREATE POLICY "document_requests_update_agent"
  ON document_requests FOR UPDATE
  USING (
    property_id IN (
      SELECT p.id FROM properties p
      JOIN   landlords l ON l.id = p.landlord_id
      WHERE  l.user_id = auth.uid()
    )
  );

-- Tenants: read-only, scoped to their tenancy via the proper FK
-- (falls back gracefully for tenants whose auth_user_id is NULL — they simply
-- won't see requests until the backfill runs and the invite is accepted)
CREATE POLICY "document_requests_select_tenant"
  ON document_requests FOR SELECT
  USING (
    property_tenant_id IN (
      SELECT id FROM property_tenants
      WHERE  auth_user_id = auth.uid()
    )
  );


-- ── Section 7: RLS — property_tenants (additive) ─────────────────────────────
--
-- The existing "property_tenants_select_by_email" policy (from the first
-- migration) remains in place as the legacy fallback path.
--
-- This new policy is the clean path for tenants who have accepted an invite
-- and had their auth_user_id written. Both policies coexist — Postgres ORs
-- them — so both paths work simultaneously during the transition period.
--
-- The email-fallback policy should be dropped only after:
--   1. The backfill migration has been verified and applied.
--   2. All new tenants are exclusively using the invite flow.
--   3. No portal sessions remain using email-only auth.

ALTER TABLE property_tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "property_tenants_select_by_auth_user_id" ON property_tenants;
CREATE POLICY "property_tenants_select_by_auth_user_id"
  ON property_tenants FOR SELECT
  USING (auth_user_id = auth.uid());
