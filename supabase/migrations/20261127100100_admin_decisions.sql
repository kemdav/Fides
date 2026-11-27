-- ============================================================
-- Fides: admin decisions as single transactions
--
-- Approve, reject and suspend were several separate writes with manual cleanup,
-- so a failure halfway left a business half created or half suspended.
--
-- These run as the caller (security invoker) and only the server may execute
-- them. The server checks that the caller is a platform admin first.
-- ============================================================

begin;

-- approval creates the account but does not publish the website: the owner does
-- that. the public pages hide a site while is_published is false.
create or replace function public.approve_application(
  p_application_id uuid,
  p_actor_id uuid,
  p_actor_name text,
  p_slug_base text,
  p_trial_days integer
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_app public.account_applications%rowtype;
  v_business public.application_businesses%rowtype;
  v_tier_id uuid;
  v_tenant_id uuid;
  v_slug text;
  v_attempt integer := 1;
  v_trial_end timestamptz := now() + make_interval(days => p_trial_days);
begin
  select * into v_app from public.account_applications where id = p_application_id for update;
  if not found then
    raise exception 'APPLICATION_NOT_FOUND';
  end if;
  if v_app.status <> 'pending' then
    raise exception 'APPLICATION_NOT_PENDING';
  end if;

  select * into v_business from public.application_businesses where application_id = p_application_id;
  if not found then
    raise exception 'BUSINESS_MISSING';
  end if;

  select id into v_tier_id from public.subscription_tiers where code = v_app.plan_code;
  if v_tier_id is null then
    raise exception 'PLAN_MISSING';
  end if;

  if v_business.requested_slug is not null then
    v_slug := v_business.requested_slug;
    if exists (select 1 from public.tenants where slug = v_slug) then
      raise exception 'SLUG_TAKEN';
    end if;
  else
    v_slug := p_slug_base;
    while exists (select 1 from public.tenants where slug = v_slug) loop
      v_attempt := v_attempt + 1;
      v_slug := p_slug_base || '-' || v_attempt;
    end loop;
  end if;

  insert into public.tenants (name, slug, status, logo_url, address, phone, timezone)
  values (
    v_business.business_name,
    v_slug,
    'active',
    v_business.logo_url,
    concat_ws(', ', v_business.street_address, v_business.city, v_business.province || ' ' || v_business.zip_code),
    v_app.phone,
    'Asia/Manila'
  )
  returning id into v_tenant_id;

  insert into public.profiles (id, email, full_name, role, tenant_id)
  values (v_app.user_id, v_app.email, v_app.full_name, 'owner', v_tenant_id)
  on conflict (id) do update
    set email = excluded.email, full_name = excluded.full_name, role = excluded.role, tenant_id = excluded.tenant_id;

  insert into public.tenant_memberships (tenant_id, profile_id, role)
  values (v_tenant_id, v_app.user_id, 'owner')
  on conflict (tenant_id, profile_id) do update set role = excluded.role;

  insert into public.tenant_settings (tenant_id, display_name, currency, locale, is_published)
  values (v_tenant_id, v_business.business_name, 'PHP', 'en-PH', false)
  on conflict (tenant_id) do update set is_published = false;

  insert into public.subscriptions (tenant_id, tier_id, status, trial_ends_at, current_period_start, current_period_end)
  values (v_tenant_id, v_tier_id, 'trialing', v_trial_end, now(), v_trial_end);

  insert into public.tenant_billing_profiles (tenant_id, billing_name, billing_email, street_barangay, city, province, postal_code)
  values (
    v_tenant_id, v_business.business_name, v_app.email,
    v_business.street_address, v_business.city, v_business.province, v_business.zip_code
  )
  on conflict (tenant_id) do nothing;

  update public.account_applications
     set status = 'approved',
         approved_at = now(),
         decided_at = now(),
         reviewed_at = now(),
         reviewed_by = p_actor_name,
         review_notes = null,
         tenant_id = v_tenant_id
   where id = p_application_id;

  insert into public.admin_activity_log
    (application_id, business_name, actor, actor_id, action, category, before_value, after_value, reason)
  values (
    p_application_id, v_business.business_name, p_actor_name, p_actor_id,
    'Verification completed', 'verification', 'Pending', 'Approved',
    'Application reviewed and approved by the platform administrator.'
  );

  return v_tenant_id;
end;
$$;

-- records the rejection. erasing the files and the login happens afterwards on the
-- server (storage and auth are outside this transaction); while that is unfinished
-- the application stays here as rejected, and rejecting it again finishes the job.
-- returns false when it was already recorded.
create or replace function public.reject_application(
  p_application_id uuid,
  p_actor_id uuid,
  p_actor_name text,
  p_reason text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_app public.account_applications%rowtype;
  v_business public.application_businesses%rowtype;
  v_owner text;
begin
  select * into v_app from public.account_applications where id = p_application_id for update;
  if not found then
    raise exception 'APPLICATION_NOT_FOUND';
  end if;
  if v_app.status = 'rejected' then
    return false;
  end if;
  if v_app.status <> 'pending' then
    raise exception 'APPLICATION_NOT_PENDING';
  end if;

  select * into v_business from public.application_businesses where application_id = p_application_id;
  select owner_legal_name into v_owner from public.application_identities where application_id = p_application_id;

  insert into public.rejected_accounts (
    application_id, reference_code, email, full_name, owner_legal_name, phone, business_name,
    business_type, location, plan_code, rejection_reason, submitted_at, rejected_at, rejected_by, email_sent
  )
  values (
    v_app.id, v_app.reference_code, v_app.email, v_app.full_name, coalesce(v_owner, v_app.full_name), v_app.phone,
    v_business.business_name, v_business.business_type,
    nullif(concat_ws(', ', v_business.city, v_business.province), ''),
    v_app.plan_code, p_reason, v_app.submitted_at, now(), p_actor_name, false
  )
  on conflict (application_id) do update
    set rejection_reason = excluded.rejection_reason,
        rejected_at = excluded.rejected_at,
        rejected_by = excluded.rejected_by;

  update public.account_applications
     set status = 'rejected',
         decided_at = now(),
         reviewed_at = now(),
         reviewed_by = p_actor_name,
         review_notes = p_reason
   where id = p_application_id;

  insert into public.admin_activity_log
    (application_id, business_name, actor, actor_id, action, category, before_value, after_value, reason)
  values (
    p_application_id, coalesce(v_business.business_name, v_app.full_name), p_actor_name, p_actor_id,
    'Application rejected', 'verification', 'Pending', 'Rejected', p_reason
  );

  return true;
end;
$$;

-- suspend or reactivate one or many. all of them change or none do.
-- ids that are not approved or suspended accounts are skipped.
create or replace function public.set_account_access(
  p_application_ids uuid[],
  p_suspend boolean,
  p_actor_id uuid,
  p_actor_name text,
  p_reason text
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_app public.account_applications%rowtype;
  v_target public.application_status := case when p_suspend then 'suspended' else 'approved' end;
  v_name text;
  v_changed integer := 0;
begin
  if (select count(*) from public.account_applications where id = any (p_application_ids))
     <> (select count(distinct x) from unnest(p_application_ids) as x) then
    raise exception 'APPLICATION_NOT_FOUND';
  end if;

  -- locked in a fixed order so two bulk changes cannot deadlock
  for v_app in
    select * from public.account_applications where id = any (p_application_ids) order by id for update
  loop
    continue when v_app.status = v_target or v_app.status not in ('approved', 'suspended');

    update public.account_applications set status = v_target where id = v_app.id;
    if v_app.tenant_id is not null then
      update public.tenants
         set status = case when p_suspend then 'suspended'::public.tenant_status else 'active'::public.tenant_status end
       where id = v_app.tenant_id;
    end if;

    select business_name into v_name from public.application_businesses where application_id = v_app.id;
    insert into public.admin_activity_log
      (application_id, business_name, actor, actor_id, action, category, before_value, after_value, reason)
    values (
      v_app.id, coalesce(v_name, v_app.full_name), p_actor_name, p_actor_id,
      case when p_suspend then 'Account suspended' else 'Account reactivated' end,
      'account',
      case when p_suspend then 'Active' else 'Suspended' end,
      case when p_suspend then 'Suspended' else 'Active' end,
      p_reason
    );
    v_changed := v_changed + 1;
  end loop;

  return v_changed;
end;
$$;

revoke all on function public.approve_application(uuid, uuid, text, text, integer) from public, anon, authenticated;
revoke all on function public.reject_application(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.set_account_access(uuid[], boolean, uuid, text, text) from public, anon, authenticated;
grant execute on function public.approve_application(uuid, uuid, text, text, integer) to service_role;
grant execute on function public.reject_application(uuid, uuid, text, text) to service_role;
grant execute on function public.set_account_access(uuid[], boolean, uuid, text, text) to service_role;

commit;

notify pgrst, 'reload schema';
