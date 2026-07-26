-- Phase 5: lock down the deployops-drawings storage bucket.
-- Requires deployops_role() from deployops_profiles.sql.
--
-- ORDER OF OPERATIONS — read before running:
--   Step A (audit) is read-only. Run it first and look at the output.
--   Steps B + C flip the bucket private and add policies. The moment B runs,
--   every getPublicUrl() link in the OLD client 404s. So either:
--     - ship the signed-URL index.html FIRST (see CC-Prompt-Storage-SignedUrls.md),
--       then run B + C; or
--     - accept a few minutes of broken drawing images while you deploy.
--   Nothing here is destructive to files.

-- ============================================================
-- STEP A — AUDIT (read-only). Run this on its own and inspect.
-- ============================================================
-- A1. Is the bucket public right now?
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'deployops-drawings';

-- A2. Every policy currently on storage.objects. THE IMPORTANT ONE:
--     look for any row where roles includes "anon" and cmd is INSERT/UPDATE/DELETE.
--     That means anyone holding the anon key can upload or delete your drawings today.
select policyname, cmd, roles, qual as using_expr, with_check
from pg_policies where schemaname = 'storage' and tablename = 'objects'
order by cmd, policyname;

-- ============================================================
-- STEP B — make the bucket private
-- ============================================================
update storage.buckets set public = false where id = 'deployops-drawings';

-- Optional but recommended hardening: cap size and restrict MIME types.
-- The app only ever stores PNG pages and one source PDF per drawing.
update storage.buckets
set file_size_limit = 52428800,  -- 50 MB
    allowed_mime_types = array['image/png','application/pdf']
where id = 'deployops-drawings';

-- ============================================================
-- STEP C — policies: invited users read, admins write
-- ============================================================
-- Drop anything permissive that may already exist on this bucket, including
-- the default "public read" policies the Supabase UI creates.
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (qual like '%deployops-drawings%' or with_check like '%deployops-drawings%')
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

-- READ: any invited user (has a row in authentication_mode_user_roles).
-- deployops_role() returns null for a signed-in-but-not-invited account,
-- so this is stricter than a bare "to authenticated".
create policy "dwg read invited" on storage.objects for select to authenticated
using (bucket_id = 'deployops-drawings' and deployops_role() is not null);

-- WRITE: admins only.
create policy "dwg insert admin" on storage.objects for insert to authenticated
with check (bucket_id = 'deployops-drawings' and deployops_role() = 'admin');

create policy "dwg update admin" on storage.objects for update to authenticated
using (bucket_id = 'deployops-drawings' and deployops_role() = 'admin')
with check (bucket_id = 'deployops-drawings' and deployops_role() = 'admin');

create policy "dwg delete admin" on storage.objects for delete to authenticated
using (bucket_id = 'deployops-drawings' and deployops_role() = 'admin');

-- ============================================================
-- STEP D — VERIFY
-- ============================================================
-- D1. Bucket must report public = false.
select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'deployops-drawings';

-- D2. Should list exactly the four "dwg *" policies and no anon writes.
select policyname, cmd, roles from pg_policies
where schemaname = 'storage' and tablename = 'objects' order by cmd;

-- D3. Manual check in the browser, signed OUT: paste a known object URL
--     https://<project>.supabase.co/storage/v1/object/public/deployops-drawings/<REF>/page_1.png
--     It must now return 400/404, not the image.
