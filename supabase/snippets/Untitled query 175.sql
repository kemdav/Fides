DO $$
DECLARE
    v_user_id uuid;
    v_other_tenant_id uuid;
BEGIN
    -- 1. Grab the outsider user and confirm their email
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'outsider@gmail.com' LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User outsider@gmail.com not found. Create it in Authentication -> Users first.';
    END IF;

    UPDATE auth.users
    SET email_confirmed_at = now()
    WHERE id = v_user_id;

    -- 2. Find or create a separate tenant (NOT aura-wellness)
    SELECT id INTO v_other_tenant_id FROM public.tenants WHERE slug = 'other-shop' LIMIT 1;

    IF v_other_tenant_id IS NULL THEN
        v_other_tenant_id := gen_random_uuid();

        INSERT INTO public.tenants (id, name, slug, status)
        VALUES (v_other_tenant_id, 'Other Shop', 'other-shop', 'active');

        INSERT INTO public.tenant_settings (tenant_id, display_name, tagline, currency, locale)
        VALUES (v_other_tenant_id, 'Other Shop', 'Separate Business', 'PHP', 'en-PH');
    END IF;

    -- 3. Link profile & membership ONLY to other-shop
    UPDATE public.profiles
    SET tenant_id = v_other_tenant_id, role = 'owner', full_name = 'Outsider User'
    WHERE id = v_user_id;

    INSERT INTO public.tenant_memberships (tenant_id, profile_id, role)
    VALUES (v_other_tenant_id, v_user_id, 'owner')
    ON CONFLICT (tenant_id, profile_id) DO UPDATE SET role = 'owner';

    -- 4. Approve their application so they can pass /login
    INSERT INTO public.account_applications (
        user_id, full_name, email, phone, status, plan_code,
        terms_accepted_at, consent_accepted_at, submitted_at, approved_at, tenant_id
    )
    VALUES (
        v_user_id, 'Outsider User', 'outsider@gmail.com', '09987654321', 'approved', 'starter',
        now(), now(), now(), now(), v_other_tenant_id
    )
    ON CONFLICT (user_id) DO UPDATE
    SET status = 'approved', tenant_id = v_other_tenant_id, approved_at = now();
END $$;