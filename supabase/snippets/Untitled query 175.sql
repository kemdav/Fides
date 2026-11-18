DO $$
DECLARE
  target_user_id uuid;
  new_tenant_id uuid;
  user_email text := 'imongmamabodak@gmail.com'; 
BEGIN
  -- 1. Find your user ID
  SELECT id INTO target_user_id FROM public.profiles WHERE email = user_email LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found for %. Ensure you added them in Authentication > Users first.', user_email;
  END IF;

  -- 2. Create the Aura Wellness business (tenant)
  INSERT INTO public.tenants (name, slug, status)
  VALUES ('Aura Wellness', 'aura-wellness', 'active')
  RETURNING id INTO new_tenant_id;

  -- 3. Link your profile to Aura Wellness as the owner
  UPDATE public.profiles
  SET role = 'owner', tenant_id = new_tenant_id
  WHERE id = target_user_id;

  -- 4. Grant you active membership to the business
  INSERT INTO public.tenant_memberships (tenant_id, profile_id, role)
  VALUES (new_tenant_id, target_user_id, 'owner')
  ON CONFLICT (tenant_id, profile_id) DO UPDATE SET role = 'owner';

  -- 5. Create the approved account application to satisfy getAccountAccess()
  INSERT INTO public.account_applications (
    user_id,
    full_name,
    email,
    phone,
    status,
    plan_code,
    terms_accepted_at,
    consent_accepted_at,
    tenant_id,
    submitted_at,
    approved_at
  )
  VALUES (
    target_user_id,
    'Aura Manager',
    user_email,
    '09123456789',
    'approved',
    'starter', 
    NOW(),
    NOW(),
    new_tenant_id,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET 
    status = 'approved',
    tenant_id = new_tenant_id,
    approved_at = NOW();

  -- 6. Setup default tenant settings for localization
  INSERT INTO public.tenant_settings (tenant_id, display_name, currency, locale)
  VALUES (new_tenant_id, 'Aura Wellness', 'PHP', 'en-PH')
  ON CONFLICT (tenant_id) DO NOTHING;

END $$;