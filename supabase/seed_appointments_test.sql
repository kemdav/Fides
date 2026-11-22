-- ============================================================================
-- Fides — Sample Seed Data for [MAN-DAS] Calendar & Appointment Testing
-- Target Tenant: aura-wellness ("Aura Studio & Spa")
-- Run this snippet in your Supabase SQL Editor.
-- ============================================================================

DO $$
DECLARE
    v_tenant_id UUID;
    v_profile_id UUID;
    v_staff_sofia UUID;
    v_staff_miguel UUID;
    v_staff_elena UUID;
    v_svc_haircut UUID;
    v_svc_balayage UUID;
    v_svc_manicure UUID;
    v_svc_massage UUID;
    v_svc_facial UUID;
    v_cust_juan UUID;
    v_cust_maria UUID;
    v_cust_ana UUID;
    v_appt_today_1 UUID;
    v_appt_today_2 UUID;
    v_appt_today_3 UUID;
    v_appt_today_4 UUID;
    v_appt_pending UUID;
    v_appt_tomorrow UUID;
    v_today_date DATE;
BEGIN
    -- 1. Ensure Tenant exists
    INSERT INTO public.tenants (name, slug, brand_color, status)
    VALUES ('Aura Studio & Spa', 'aura-wellness', '#c35000', 'active')
    ON CONFLICT (slug) DO UPDATE
    SET name = 'Aura Studio & Spa', status = 'active'
    RETURNING id INTO v_tenant_id;

    -- 2. Link the current authenticated user as tenant owner if running as user
    SELECT auth.uid() INTO v_profile_id;
    IF v_profile_id IS NOT NULL THEN
        INSERT INTO public.tenant_memberships (tenant_id, profile_id, role)
        VALUES (v_tenant_id, v_profile_id, 'owner')
        ON CONFLICT (tenant_id, profile_id) DO UPDATE SET role = 'owner';

        UPDATE public.profiles
        SET tenant_id = v_tenant_id, role = 'owner'
        WHERE id = v_profile_id;
    END IF;

    -- 3. Seed Staff Members
    INSERT INTO public.staff_members (tenant_id, full_name, active)
    VALUES (v_tenant_id, 'Sofia Cruz', true)
    ON CONFLICT (tenant_id, id) DO NOTHING
    RETURNING id INTO v_staff_sofia;

    IF v_staff_sofia IS NULL THEN
        SELECT id INTO v_staff_sofia FROM public.staff_members WHERE tenant_id = v_tenant_id AND full_name = 'Sofia Cruz' LIMIT 1;
    END IF;

    INSERT INTO public.staff_members (tenant_id, full_name, active)
    VALUES (v_tenant_id, 'Miguel Tan', true)
    ON CONFLICT (tenant_id, id) DO NOTHING
    RETURNING id INTO v_staff_miguel;

    IF v_staff_miguel IS NULL THEN
        SELECT id INTO v_staff_miguel FROM public.staff_members WHERE tenant_id = v_tenant_id AND full_name = 'Miguel Tan' LIMIT 1;
    END IF;

    INSERT INTO public.staff_members (tenant_id, full_name, active)
    VALUES (v_tenant_id, 'Elena Cruz', true)
    ON CONFLICT (tenant_id, id) DO NOTHING
    RETURNING id INTO v_staff_elena;

    IF v_staff_elena IS NULL THEN
        SELECT id INTO v_staff_elena FROM public.staff_members WHERE tenant_id = v_tenant_id AND full_name = 'Elena Cruz' LIMIT 1;
    END IF;

    -- 4. Seed Services
    INSERT INTO public.services (tenant_id, name, slug, duration_minutes, price_cents, active)
    VALUES (v_tenant_id, 'Signature haircut', 'signature-haircut', 60, 45000, true)
    ON CONFLICT (tenant_id, slug) DO UPDATE SET price_cents = 45000
    RETURNING id INTO v_svc_haircut;

    INSERT INTO public.services (tenant_id, name, slug, duration_minutes, price_cents, active)
    VALUES (v_tenant_id, 'Balayage & gloss', 'balayage-gloss', 90, 150000, true)
    ON CONFLICT (tenant_id, slug) DO UPDATE SET price_cents = 150000
    RETURNING id INTO v_svc_balayage;

    INSERT INTO public.services (tenant_id, name, slug, duration_minutes, price_cents, active)
    VALUES (v_tenant_id, 'Botanical spa manicure', 'botanical-spa-manicure', 45, 95000, true)
    ON CONFLICT (tenant_id, slug) DO UPDATE SET price_cents = 95000
    RETURNING id INTO v_svc_manicure;

    INSERT INTO public.services (tenant_id, name, slug, duration_minutes, price_cents, active)
    VALUES (v_tenant_id, 'Wellness massage', 'wellness-massage', 60, 120000, true)
    ON CONFLICT (tenant_id, slug) DO UPDATE SET price_cents = 120000
    RETURNING id INTO v_svc_massage;

    INSERT INTO public.services (tenant_id, name, slug, duration_minutes, price_cents, active)
    VALUES (v_tenant_id, 'Facial treatment', 'facial-treatment', 60, 90000, true)
    ON CONFLICT (tenant_id, slug) DO UPDATE SET price_cents = 90000
    RETURNING id INTO v_svc_facial;

    -- 5. Seed Customers
    INSERT INTO public.customers (tenant_id, full_name, email, phone)
    VALUES (v_tenant_id, 'Juan Dela Cruz', 'juan@example.ph', '+63 995 123 4567')
    RETURNING id INTO v_cust_juan;

    INSERT INTO public.customers (tenant_id, full_name, email, phone)
    VALUES (v_tenant_id, 'Maria Santos', 'maria.santos@example.ph', '+63 917 234 5678')
    RETURNING id INTO v_cust_maria;

    INSERT INTO public.customers (tenant_id, full_name, email, phone)
    VALUES (v_tenant_id, 'Ana Reyes', 'ana.reyes@example.ph', '+63 918 345 6789')
    RETURNING id INTO v_cust_ana;

    -- Current date in Asia/Manila (UTC+8)
    v_today_date := (NOW() AT TIME ZONE 'Asia/Manila')::DATE;

    -- 6. Seed Appointments for Today in Asia/Manila
    -- Appt 1: Confirmed at 10:00 AM Manila
    INSERT INTO public.appointments (
        tenant_id, customer_id, staff_id, starts_at, ends_at, timezone,
        status, source, total_cents, notes
    )
    VALUES (
        v_tenant_id, v_cust_juan, v_staff_sofia,
        (v_today_date + TIME '10:00:00') AT TIME ZONE 'Asia/Manila',
        (v_today_date + TIME '11:00:00') AT TIME ZONE 'Asia/Manila',
        'Asia/Manila', 'confirmed', 'online', 45000, 'First time visit'
    )
    RETURNING id INTO v_appt_today_1;

    INSERT INTO public.appointment_services (tenant_id, appointment_id, service_id, staff_id, price_cents, duration_minutes)
    VALUES (v_tenant_id, v_appt_today_1, v_svc_haircut, v_staff_sofia, 45000, 60);

    -- Appt 2: Checked In at 11:30 AM Manila
    INSERT INTO public.appointments (
        tenant_id, customer_id, staff_id, starts_at, ends_at, timezone,
        status, source, total_cents
    )
    VALUES (
        v_tenant_id, v_cust_maria, v_staff_miguel,
        (v_today_date + TIME '11:30:00') AT TIME ZONE 'Asia/Manila',
        (v_today_date + TIME '13:00:00') AT TIME ZONE 'Asia/Manila',
        'Asia/Manila', 'checked_in', 'online', 150000
    )
    RETURNING id INTO v_appt_today_2;

    INSERT INTO public.appointment_services (tenant_id, appointment_id, service_id, staff_id, price_cents, duration_minutes)
    VALUES (v_tenant_id, v_appt_today_2, v_svc_balayage, v_staff_miguel, 150000, 90);

    -- Appt 3: In Service at 01:30 PM Manila (Walk-in)
    INSERT INTO public.appointments (
        tenant_id, customer_id, staff_id, starts_at, ends_at, timezone,
        status, source, total_cents
    )
    VALUES (
        v_tenant_id, v_cust_ana, v_staff_elena,
        (v_today_date + TIME '13:30:00') AT TIME ZONE 'Asia/Manila',
        (v_today_date + TIME '14:15:00') AT TIME ZONE 'Asia/Manila',
        'Asia/Manila', 'in_service', 'walk_in', 95000
    )
    RETURNING id INTO v_appt_today_3;

    INSERT INTO public.appointment_services (tenant_id, appointment_id, service_id, staff_id, price_cents, duration_minutes)
    VALUES (v_tenant_id, v_appt_today_3, v_svc_manicure, v_staff_elena, 95000, 45);

    -- Appt 4: Completed at 02:30 PM Manila (Walk-in with Paid Payment)
    INSERT INTO public.appointments (
        tenant_id, customer_id, staff_id, starts_at, ends_at, timezone,
        status, source, total_cents
    )
    VALUES (
        v_tenant_id, v_cust_juan, v_staff_sofia,
        (v_today_date + TIME '14:30:00') AT TIME ZONE 'Asia/Manila',
        (v_today_date + TIME '15:30:00') AT TIME ZONE 'Asia/Manila',
        'Asia/Manila', 'completed', 'walk_in', 120000
    )
    RETURNING id INTO v_appt_today_4;

    INSERT INTO public.appointment_services (tenant_id, appointment_id, service_id, staff_id, price_cents, duration_minutes)
    VALUES (v_tenant_id, v_appt_today_4, v_svc_massage, v_staff_sofia, 120000, 60);

    INSERT INTO public.payments (tenant_id, appointment_id, customer_id, amount_cents, status, method, paid_at)
    VALUES (v_tenant_id, v_appt_today_4, v_cust_juan, 120000, 'paid', 'cash', (v_today_date + TIME '15:35:00') AT TIME ZONE 'Asia/Manila');

    -- Appt 5: Pending Approval at 04:00 PM Manila (Guest booking with NULL customer_id)
    INSERT INTO public.appointments (
        tenant_id, customer_id, staff_id, starts_at, ends_at, timezone,
        status, source, total_cents, notes
    )
    VALUES (
        v_tenant_id, NULL, v_staff_miguel,
        (v_today_date + TIME '16:00:00') AT TIME ZONE 'Asia/Manila',
        (v_today_date + TIME '17:00:00') AT TIME ZONE 'Asia/Manila',
        'Asia/Manila', 'pending_approval', 'online', 90000, 'Customer: Carlos Garcia; Phone: 09175551234'
    )
    RETURNING id INTO v_appt_pending;

    INSERT INTO public.appointment_services (tenant_id, appointment_id, service_id, staff_id, price_cents, duration_minutes)
    VALUES (v_tenant_id, v_appt_pending, v_svc_facial, v_staff_miguel, 90000, 60);

    -- Appt 6: Tomorrow booking (for week chart and future view)
    INSERT INTO public.appointments (
        tenant_id, customer_id, staff_id, starts_at, ends_at, timezone,
        status, source, total_cents
    )
    VALUES (
        v_tenant_id, v_cust_maria, v_staff_sofia,
        ((v_today_date + 1) + TIME '10:00:00') AT TIME ZONE 'Asia/Manila',
        ((v_today_date + 1) + TIME '11:00:00') AT TIME ZONE 'Asia/Manila',
        'Asia/Manila', 'confirmed', 'online', 45000
    )
    RETURNING id INTO v_appt_tomorrow;

    INSERT INTO public.appointment_services (tenant_id, appointment_id, service_id, staff_id, price_cents, duration_minutes)
    VALUES (v_tenant_id, v_appt_tomorrow, v_svc_haircut, v_staff_sofia, 45000, 60);

    -- 7. Seed Waitlist Entry
    INSERT INTO public.waitlist_entries (
        tenant_id, guest_name, guest_phone, service_id, staff_id, status, notes
    )
    VALUES (
        v_tenant_id, 'Liza Soberano', '+63 920 999 8888', v_svc_facial, v_staff_miguel, 'waiting', 'Walk-in requested next available slot'
    );

    RAISE NOTICE 'Sample data successfully seeded for tenant aura-wellness (ID: %)', v_tenant_id;
END
$$;
