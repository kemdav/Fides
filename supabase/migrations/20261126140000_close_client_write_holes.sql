-- ============================================================
-- Fides: close client-side access holes
--
-- Supabase grants every new public table and function to anon and authenticated
-- by default. A column-level or "revoke from public" statement does not undo
-- that, so several protections never took effect. Safe to apply on its own.
-- ============================================================

begin;

-- 1. profiles: users could change their own role and tenant_id.
revoke all on public.profiles from anon;
revoke insert, update, delete, truncate, references, trigger on public.profiles from authenticated;
grant update (full_name, email) on public.profiles to authenticated;

-- 2. tables with row level security switched off: readable and writable with the public key.
--    only the server (service role) reads or writes them.
alter table public.account_applications   enable row level security;
alter table public.application_identities enable row level security;
alter table public.application_businesses enable row level security;
alter table public.admin_activity_log     enable row level security;
alter table public.subscription_plans     enable row level security;
revoke all on public.account_applications,
              public.application_identities,
              public.application_businesses,
              public.admin_activity_log,
              public.subscription_plans
  from anon, authenticated;

-- the storage policy for applicants' own documents looks up their application,
-- and every signed-in storage read evaluates it: allow exactly that lookup.
grant select (id, user_id) on public.account_applications to authenticated;
drop policy if exists account_applications_select_own on public.account_applications;
create policy account_applications_select_own
  on public.account_applications for select
  to authenticated
  using (user_id = (select auth.uid()));

-- 3. memberships: inserting only had to match the tenant, so any member could add an owner.
drop policy if exists memberships_manage_tenant_owner on public.tenant_memberships;
create policy memberships_manage_tenant_owner
  on public.tenant_memberships for all
  to authenticated
  using (
    public.is_platform_admin()
    or (tenant_id = public.get_my_tenant_id() and public.current_profile_role() in ('owner', 'admin'))
  )
  with check (
    public.is_platform_admin()
    or (tenant_id = public.get_my_tenant_id() and public.current_profile_role() in ('owner', 'admin'))
  );

-- 4. tenants: an owner could lift their own suspension by writing status.
create or replace function public.protect_tenant_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     and coalesce(auth.role(), '') in ('anon', 'authenticated')
     and not public.is_platform_admin() then
    raise exception 'Only the platform can change a business status.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_tenant_status on public.tenants;
create trigger protect_tenant_status
  before update of status on public.tenants
  for each row execute function public.protect_tenant_status();

-- 5. subscriptions: an owner could write tier_id, status and period dates directly.
--    keep only the columns the billing screen sets.
revoke insert, update, delete, truncate on public.subscriptions from anon, authenticated;
grant update (
  scheduled_tier_id,
  scheduled_change_effective_at,
  cancel_at_period_end,
  cancellation_reason,
  trial_conversion_scheduled,
  reactivation_requested_at,
  renewal_reminders_enabled
) on public.subscriptions to authenticated;

-- 6. invoices and payment proofs: an owner could create them already paid or verified.
drop policy if exists subscription_invoices_owner_insert on public.subscription_invoices;
create policy subscription_invoices_owner_insert
  on public.subscription_invoices for insert
  to authenticated
  with check (
    status = 'unpaid'
    and amount_paid_cents = 0
    and paid_at is null
    and exists (
      select 1 from public.tenant_memberships tm
      where tm.tenant_id = subscription_invoices.tenant_id
        and tm.profile_id = auth.uid()
        and tm.role = 'owner'
    )
  );

drop policy if exists subscription_payment_submissions_owner_insert on public.subscription_payment_submissions;
create policy subscription_payment_submissions_owner_insert
  on public.subscription_payment_submissions for insert
  to authenticated
  with check (
    status = 'pending_verification'
    and reviewer_notes is null
    and exists (
      select 1 from public.tenant_memberships tm
      where tm.tenant_id = subscription_payment_submissions.tenant_id
        and tm.profile_id = auth.uid()
        and tm.role = 'owner'
    )
  );

-- 7. security definer functions meant for the server were still callable by clients.
--    manage_staff_profile trusts the actor id it is given.
revoke all on function public.manage_staff_profile(uuid, uuid, uuid, text, text, text, text, public.app_role, uuid[], public.commission_type, numeric, text) from public, anon, authenticated;
revoke all on function public.reserve_staff_email_change(uuid) from public, anon, authenticated;
revoke all on function public.sync_verified_profile_email() from public, anon, authenticated;
revoke all on function public.protect_last_active_staff_owner() from public, anon, authenticated;
revoke all on function public.require_walkin_workspace_operator() from public, anon, authenticated;

-- 8. truncate ignores row level security.
revoke truncate on all tables in schema public from anon, authenticated;

commit;
