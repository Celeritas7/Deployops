-- Phase 4: RLS on all app tables. Deploy the gated index.html FIRST —
-- once this runs, the bare anon key reads NOTHING.
-- Requires deployops_role() from deployops_profiles.sql.

-- Admin-write tables: any invited user reads; only admins write.
do $$
declare t text;
begin
  foreach t in array array['deployops_drawings','deployops_drawing_folders','deployops_balloons','deployops_symbols','deployops_models','deployops_units','deployops_checklist_items','deployops_sections'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "authed read" on %I', t);
    execute format('create policy "authed read" on %I for select to authenticated using (true)', t);
    execute format('drop policy if exists "admin insert" on %I', t);
    execute format('create policy "admin insert" on %I for insert to authenticated with check (deployops_role() = ''admin'')', t);
    execute format('drop policy if exists "admin update" on %I', t);
    execute format('create policy "admin update" on %I for update to authenticated using (deployops_role() = ''admin'') with check (deployops_role() = ''admin'')', t);
    execute format('drop policy if exists "admin delete" on %I', t);
    execute format('create policy "admin delete" on %I for delete to authenticated using (deployops_role() = ''admin'')', t);
  end loop;
end $$;

-- deployops_unit_checks: the checklist-tick table. Operators (and admins)
-- insert/update tick rows; only admins delete. The app upserts whole rows
-- here, so no column-level rules are needed.
alter table deployops_unit_checks enable row level security;
drop policy if exists "authed read" on deployops_unit_checks;
create policy "authed read" on deployops_unit_checks for select to authenticated using (true);
drop policy if exists "op insert ticks" on deployops_unit_checks;
create policy "op insert ticks" on deployops_unit_checks for insert to authenticated with check (deployops_role() in ('admin','operator'));
drop policy if exists "op update ticks" on deployops_unit_checks;
create policy "op update ticks" on deployops_unit_checks for update to authenticated using (deployops_role() in ('admin','operator')) with check (deployops_role() in ('admin','operator'));
drop policy if exists "admin delete ticks" on deployops_unit_checks;
create policy "admin delete ticks" on deployops_unit_checks for delete to authenticated using (deployops_role() = 'admin');
-- ============================================================
-- Phase 0 (2026-10): remove the legacy allow-all policies that pre-date the
-- login gate. Postgres ORs policies together, so as long as these exist the
-- admin-only rules above are bypassed and the bare anon key can read/write
-- every table. Names are the ones present in the live project.
-- ============================================================
do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename like 'deployops\_%'
      and (policyname like '%\_all' or policyname like '%\_auth' or policyname like '%\_anon\_all' or policyname like '%\_auth\_all')
  loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

-- Reads require an *invited* account, not merely a Supabase login
-- (deployops_role() is null for a signed-in but uninvited user). Matches the
-- storage bucket policy.
do $$
declare t text;
begin
  foreach t in array array['deployops_drawings','deployops_drawing_folders','deployops_balloons','deployops_symbols','deployops_models','deployops_units','deployops_checklist_items','deployops_sections','deployops_unit_checks'] loop
    execute format('drop policy if exists "authed read" on %I', t);
    execute format('create policy "authed read" on %I for select to authenticated using (deployops_role() is not null)', t);
  end loop;
end $$;

-- Verify: expect only "authed read" / "admin *" / "op *" rows, no anon or public roles.
-- select tablename, policyname, cmd, roles from pg_policies where schemaname='public' and tablename like 'deployops\_%' order by 1,3;
