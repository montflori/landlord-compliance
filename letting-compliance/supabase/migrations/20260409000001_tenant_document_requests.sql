-- Creates tenant_document_requests table.
--
-- Status flow:
--   requested  → uploaded  (tenant uploads a file against this request)
--              → approved  (agent approves the upload)
--              → rejected  (agent rejects, with a reason; tenant may re-upload)
--
-- The link from a request to the fulfilling document is:
--   tenant_document_requests.uploaded_document_id → tenant_documents.id
-- (The reverse FK tenant_documents.document_request_id → document_requests.id
--  is a separate legacy column from the v2 migration and is unrelated.)

CREATE TABLE IF NOT EXISTS tenant_document_requests (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_tenant_id   uuid        NOT NULL REFERENCES property_tenants(id) ON DELETE CASCADE,
  property_id          uuid        NOT NULL REFERENCES properties(id)        ON DELETE CASCADE,
  requested_by_user_id uuid        REFERENCES auth.users(id)                 ON DELETE SET NULL,
  document_type        text        NOT NULL,
  title                text        NOT NULL,
  description          text,
  is_required          boolean     NOT NULL DEFAULT false,
  due_date             date,
  status               text        NOT NULL DEFAULT 'requested'
                                   CHECK (status IN ('requested', 'uploaded', 'approved', 'rejected')),
  rejection_reason     text,
  uploaded_document_id uuid        REFERENCES tenant_documents(id)           ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tdr_property_tenant_id_idx ON tenant_document_requests(property_tenant_id);
CREATE INDEX IF NOT EXISTS tdr_property_id_idx        ON tenant_document_requests(property_id);
CREATE INDEX IF NOT EXISTS tdr_active_status_idx      ON tenant_document_requests(property_id, status)
  WHERE status IN ('requested', 'uploaded');

ALTER TABLE tenant_document_requests ENABLE ROW LEVEL SECURITY;

-- Agents: full CRUD on requests for properties they manage
CREATE POLICY "tdr_agent"
  ON tenant_document_requests
  FOR ALL
  USING (
    property_id IN (
      SELECT p.id FROM properties p
      JOIN landlords l ON l.id = p.landlord_id
      WHERE l.user_id = auth.uid()
    )
  )
  WITH CHECK (
    property_id IN (
      SELECT p.id FROM properties p
      JOIN landlords l ON l.id = p.landlord_id
      WHERE l.user_id = auth.uid()
    )
  );

-- Tenants: SELECT their own requests (matched via auth_user_id on property_tenants)
CREATE POLICY "tdr_tenant_select"
  ON tenant_document_requests
  FOR SELECT
  USING (
    property_tenant_id IN (
      SELECT id FROM property_tenants WHERE auth_user_id = auth.uid()
    )
  );
