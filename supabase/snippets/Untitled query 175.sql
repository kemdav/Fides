DO $$
DECLARE
  v_user_id uuid;
  v_tenant_id uuid;
  v_plan_code text;
  v_email text := 'hatdoggy@gmail.com';
  v_password text := 'password123';
  v_slug text := 'bella-vita';
BEGIN
  -- 1. Check if auth user exists; if not, create auth.users + auth.identities
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf')),
      now(),
      '',
      '',
      '',
      '',
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Hatdog Admin"}',
      now(),
      now()
    );

    INSERT INTO auth.identities (
      id,
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      v_user_id::text,
      v_user_id,
      format('{"sub":"%s","email":"%s"}', v_user_id::text, v_email)::jsonb,
      'email',
      now(),
      now(),
      now()
    );
  ELSE
    UPDATE auth.users
    SET email_confirmed_at = now()
    WHERE id = v_user_id;
  END IF;

  -- 2. Resolve tenant
  SELECT id INTO v_tenant_id
  FROM public.tenants
  WHERE slug = v_slug
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    INSERT INTO public.tenants (name, slug, status)
    VALUES ('Bella Vita Studio', v_slug, 'active')
    RETURNING id INTO v_tenant_id;
  END IF;

  -- 3. Resolve a valid subscription plan code for the FK
  SELECT code INTO v_plan_code
  FROM public.subscription_plans
  ORDER BY sort_order ASC
  LIMIT 1;

  IF v_plan_code IS NULL THEN
    INSERT INTO public.subscription_plans (code, name, price_php)
    VALUES ('starter', 'Starter', 999)
    RETURNING code INTO v_plan_code;
  END IF;

  -- 4. Upsert profile as owner
  INSERT INTO public.profiles (id, email, full_name, role, tenant_id)
  VALUES (v_user_id, v_email, 'Hatdog Admin', 'owner', v_tenant_id)
  ON CONFLICT (id) DO UPDATE
  SET tenant_id = v_tenant_id,
      role = 'owner',
      full_name = 'Hatdog Admin';

  -- 5. Grant tenant membership
  INSERT INTO public.tenant_memberships (tenant_id, profile_id, role)
  VALUES (v_tenant_id, v_user_id, 'owner')
  ON CONFLICT (tenant_id, profile_id) DO UPDATE
  SET role = 'owner';

  -- 6. Approve account application (all NOT NULL columns satisfied)
  INSERT INTO public.account_applications (
    user_id,
    reference_code,
    full_name,
    email,
    phone,
    status,
    plan_code,
    terms_accepted_at,
    consent_accepted_at,
    approved_at,
    tenant_id
  ) VALUES (
    v_user_id,
    'FID-QA-9999',
    'Hatdog Admin',
    v_email,
    '09123456789',
    'approved',
    v_plan_code,
    now(),
    now(),
    now(),
    v_tenant_id
  )
  ON CONFLICT (user_id) DO UPDATE
  SET status = 'approved',
      tenant_id = v_tenant_id,
      approved_at = now();
END $$;