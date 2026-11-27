-- ============================================================
-- Fides: a suspended business cannot change anything
--
-- Suspension only hid pages. Members could still write through the API, and
-- through functions such as walk-in booking and rescheduling.
--
-- A trigger covers both. It applies to signed-in and public requests; the server
-- (service role) checks the status itself before writing. Billing tables stay
-- open so a suspended owner can still pay and ask to be reactivated.
-- ============================================================

begin;

-- trigger function, so there is no tenant argument for assert_tenant_operator to check.
-- definer: the caller's row level security must not be able to hide the status.
create or replace function public.block_suspended_tenant_writes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  v_tenant_id uuid := (v_row ->> (case when tg_table_name = 'tenants' then 'id' else 'tenant_id' end))::uuid;
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated')
     and not public.is_platform_admin()
     and exists (select 1 from public.tenants t where t.id = v_tenant_id and t.status in ('suspended', 'archived')) then
    raise exception 'This business is suspended. Changes are turned off until it is reactivated.' using errcode = '42501';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.block_suspended_tenant_writes() from public, anon, authenticated;

-- every table that belongs to a business. a new one must be added here or to the
-- exempt list; scripts/tests/tenant-writes.test.mjs checks that.
do $$
declare
  v_table text;
begin
  for v_table in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'tenant_id'
      and t.table_type = 'BASE TABLE'
      and c.table_name not in (
        'profiles',               -- a person's own account
        'account_applications',   -- server only
        'subscriptions',          -- billing stays open
        'subscription_invoices',
        'subscription_payment_submissions',
        'tenant_billing_profiles'
      )
  loop
    execute format('drop trigger if exists block_suspended_tenant_writes on public.%I', v_table);
    execute format(
      'create trigger block_suspended_tenant_writes before insert or update or delete on public.%I
         for each row execute function public.block_suspended_tenant_writes()',
      v_table
    );
  end loop;
end;
$$;

drop trigger if exists block_suspended_tenant_writes on public.tenants;
create trigger block_suspended_tenant_writes
  before update or delete on public.tenants
  for each row execute function public.block_suspended_tenant_writes();

-- website images live in storage, under a folder named after the business
drop policy if exists tenant_assets_open_insert on storage.objects;
create policy tenant_assets_open_insert on storage.objects as restrictive
  for insert to authenticated
  with check (
    bucket_id <> 'tenant-assets' or not exists (
      select 1 from public.tenants t
      where t.id::text = (storage.foldername(objects.name))[1] and t.status in ('suspended', 'archived')
    )
  );

drop policy if exists tenant_assets_open_update on storage.objects;
create policy tenant_assets_open_update on storage.objects as restrictive
  for update to authenticated
  using (
    bucket_id <> 'tenant-assets' or not exists (
      select 1 from public.tenants t
      where t.id::text = (storage.foldername(objects.name))[1] and t.status in ('suspended', 'archived')
    )
  );

drop policy if exists tenant_assets_open_delete on storage.objects;
create policy tenant_assets_open_delete on storage.objects as restrictive
  for delete to authenticated
  using (
    bucket_id <> 'tenant-assets' or not exists (
      select 1 from public.tenants t
      where t.id::text = (storage.foldername(objects.name))[1] and t.status in ('suspended', 'archived')
    )
  );

commit;
