-- Phase 1: roles via the existing authentication_mode_user_roles table (email-keyed).
-- Run in Supabase SQL editor BEFORE deploying the new index.html.
-- The table already exists; this adds the role-lookup function, RLS, and admin seed.

-- Role lookup that bypasses RLS (avoids recursive policy on the roles table).
create or replace function deployops_role() returns text
language sql stable security definer set search_path = public
as $$ select role from public.authentication_mode_user_roles where lower(email) = lower(auth.jwt()->>'email') $$;
grant execute on function deployops_role() to authenticated;
revoke execute on function deployops_role() from anon;

alter table authentication_mode_user_roles enable row level security;
drop policy if exists "authed read roles" on authentication_mode_user_roles;
create policy "authed read roles" on authentication_mode_user_roles for select to authenticated using (true);
drop policy if exists "admin insert roles" on authentication_mode_user_roles;
create policy "admin insert roles" on authentication_mode_user_roles for insert to authenticated with check (deployops_role() = 'admin');
drop policy if exists "admin update roles" on authentication_mode_user_roles;
create policy "admin update roles" on authentication_mode_user_roles for update to authenticated using (deployops_role() = 'admin') with check (deployops_role() = 'admin');
drop policy if exists "admin delete roles" on authentication_mode_user_roles;
create policy "admin delete roles" on authentication_mode_user_roles for delete to authenticated using (deployops_role() = 'admin');

-- Seed the two admins (no auth.users row needed — invite by email).
insert into authentication_mode_user_roles (email, name, role) values
  ('mangaonkaraniket@gmail.com', 'Aniket', 'admin'),
  ('anikettelexistence@gmail.com', 'Aniket (TX)', 'admin')
on conflict (email) do update set role = 'admin', updated_at = now();
