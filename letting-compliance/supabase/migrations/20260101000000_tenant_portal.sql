-- ============================================================
-- Tenant Portal Migration
-- Run this in your Supabase SQL editor before using the tenant portal.
-- ============================================================

-- ── tenant_documents ──────────────────────────────────────────────────────────
-- Stores files uploaded by tenants through the portal.

create table if not exists tenant_documents (
  id                   uuid primary key default gen_random_uuid(),
  property_tenant_id   uuid not null references property_tenants(id) on delete cascade,
  property_id          uuid not null references properties(id) on delete cascade,
  uploaded_by_user_id  uuid references auth.users(id) on delete set null,
  title                text not null,
  file_name            text not null,
  file_path            text not null,  -- storage path: tenant-uploads/{userId}/{filename}
  file_size_bytes      bigint,
  mime_type            text,
  uploaded_at          timestamptz not null default now()
);

create index if not exists tenant_documents_property_tenant_id_idx
  on tenant_documents(property_tenant_id);

create index if not exists tenant_documents_uploaded_by_idx
  on tenant_documents(uploaded_by_user_id);

-- ── RLS policies ──────────────────────────────────────────────────────────────

alter table tenant_documents enable row level security;

-- Tenants: read their own uploads
create policy "tenant_docs_select_own"
  on tenant_documents for select
  using (uploaded_by_user_id = auth.uid());

-- Tenants: insert own uploads
create policy "tenant_docs_insert_own"
  on tenant_documents for insert
  with check (uploaded_by_user_id = auth.uid());

-- Tenants: delete own uploads
create policy "tenant_docs_delete_own"
  on tenant_documents for delete
  using (uploaded_by_user_id = auth.uid());

-- Agents: read documents for properties they manage
create policy "tenant_docs_select_agent"
  on tenant_documents for select
  using (
    property_id in (
      select p.id
      from   properties p
      join   landlords l on l.id = p.landlord_id
      where  l.user_id = auth.uid()
    )
  );

-- ── property_tenants RLS — allow tenants to read their own record ─────────────
-- (Skip if property_tenants already has a suitable policy.)

create policy if not exists "property_tenants_select_by_email"
  on property_tenants for select
  using (
    lead_tenant_email = (
      select email from auth.users where id = auth.uid()
    )
  );

-- ── Storage bucket ────────────────────────────────────────────────────────────
-- Create a bucket called `tenant-uploads` in the Supabase dashboard
-- (Storage → New bucket → name: tenant-uploads, public: false)
-- Then add this storage policy via Storage → Policies:
--
--   Bucket: tenant-uploads
--   Policy: Authenticated users can upload to their own folder
--   Definition: (auth.uid()::text) = (storage.foldername(name))[1]
--
-- Or run this in the SQL editor:
--
-- insert into storage.buckets (id, name, public)
-- values ('tenant-uploads', 'tenant-uploads', false)
-- on conflict do nothing;
--
-- create policy "tenant_uploads_insert_own"
--   on storage.objects for insert
--   with check (
--     bucket_id = 'tenant-uploads' and
--     (storage.foldername(name))[1] = auth.uid()::text
--   );
--
-- create policy "tenant_uploads_select_own"
--   on storage.objects for select
--   using (
--     bucket_id = 'tenant-uploads' and
--     (storage.foldername(name))[1] = auth.uid()::text
--   );
--
-- create policy "tenant_uploads_delete_own"
--   on storage.objects for delete
--   using (
--     bucket_id = 'tenant-uploads' and
--     (storage.foldername(name))[1] = auth.uid()::text
--   );
