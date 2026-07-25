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