DO $$
DECLARE
    v_user_id uuid;
    v_tenant_id uuid;
BEGIN
    -- 1. Grab your user and tenant IDs
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'hatdoggy@gmail.com' LIMIT 1;
    SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'aura-wellness' LIMIT 1;
    
    -- 2. Create the "Approved" application record that Next.js is looking for
    INSERT INTO public.account_applications (
        user_id, 
        full_name, 
        email, 
        phone, 
        status, 
        plan_code, 
        terms_accepted_at, 
        consent_accepted_at, 
        submitted_at, 
        approved_at, 
        tenant_id
    )
    VALUES (
        v_user_id, 
        'Hatdog Admin', 
        'hatdoggy@gmail.com', 
        '09123456789', 
        'approved',     -- This is the magic word the frontend wants
        'starter',      -- Links to your subscription_plans table
        now(), 
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