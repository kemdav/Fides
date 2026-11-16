-- ============================================================================
-- Fides — Walk-in waitlist migration (00007)
-- Depends on the baseline, catalog, staff, appointments, and customer migrations.
-- Uses tenant_memberships.role values directly; does not depend on public.app_role.
-- ============================================================================

BEGIN;

-- 1. Waitlist lifecycle
DO $$
BEGIN
    CREATE TYPE public.waitlist_status AS ENUM (
        'waiting',
        'notified',
        'converted',
        'expired',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

-- Allow authenticated users to use the waitlist status enum.
GRANT USAGE ON TYPE public.waitlist_status TO authenticated;

-- 2. Walk-in / waitlist entries
CREATE TABLE IF NOT EXISTS public.waitlist_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL
        REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id UUID,
    guest_name TEXT,
    guest_phone TEXT,
    service_id UUID,
    staff_id UUID,
    status public.waitlist_status NOT NULL DEFAULT 'waiting',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notified_at TIMESTAMPTZ,
    converted_appointment_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT waitlist_entries_tenant_id_id_key UNIQUE (tenant_id, id),

    CONSTRAINT waitlist_entries_customer_fkey
        FOREIGN KEY (tenant_id, customer_id)
        REFERENCES public.customers(tenant_id, id)
        ON DELETE RESTRICT,

    CONSTRAINT waitlist_entries_service_fkey
        FOREIGN KEY (tenant_id, service_id)
        REFERENCES public.services(tenant_id, id)
        ON DELETE RESTRICT,

    CONSTRAINT waitlist_entries_staff_fkey
        FOREIGN KEY (tenant_id, staff_id)
        REFERENCES public.staff_members(tenant_id, id)
        ON DELETE RESTRICT,

    CONSTRAINT waitlist_entries_identity_check CHECK (
        customer_id IS NOT NULL
        OR NULLIF(BTRIM(guest_name), '') IS NOT NULL
    ),

    CONSTRAINT waitlist_entries_guest_name_check CHECK (
        guest_name IS NULL OR NULLIF(BTRIM(guest_name), '') IS NOT NULL
    ),

    CONSTRAINT waitlist_entries_guest_phone_check CHECK (
        guest_phone IS NULL OR NULLIF(BTRIM(guest_phone), '') IS NOT NULL
    ),

    CONSTRAINT waitlist_entries_notified_at_check CHECK (
        status <> 'notified' OR notified_at IS NOT NULL
    ),

    CONSTRAINT waitlist_entries_conversion_check CHECK (
        (status = 'converted' AND converted_appointment_id IS NOT NULL)
        OR
        (status <> 'converted' AND converted_appointment_id IS NULL)
    )
);

-- 3. Link appointments back to the originating waitlist entry.
-- The reciprocal FK is added after the waitlist table exists.
ALTER TABLE public.appointments
    ADD COLUMN IF NOT EXISTS waitlist_entry_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS appointments_tenant_waitlist_entry_uidx
    ON public.appointments (tenant_id, waitlist_entry_id)
    WHERE waitlist_entry_id IS NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'appointments_waitlist_entry_fkey'
          AND conrelid = 'public.appointments'::regclass
    ) THEN
        ALTER TABLE public.appointments
            ADD CONSTRAINT appointments_waitlist_entry_fkey
            FOREIGN KEY (tenant_id, waitlist_entry_id)
            REFERENCES public.waitlist_entries(tenant_id, id)
            ON DELETE SET NULL (waitlist_entry_id);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'waitlist_entries_converted_appointment_fkey'
          AND conrelid = 'public.waitlist_entries'::regclass
    ) THEN
        ALTER TABLE public.waitlist_entries
            ADD CONSTRAINT waitlist_entries_converted_appointment_fkey
            FOREIGN KEY (tenant_id, converted_appointment_id)
            REFERENCES public.appointments(tenant_id, id)
            ON DELETE RESTRICT;
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS waitlist_entries_tenant_converted_appointment_uidx
    ON public.waitlist_entries (tenant_id, converted_appointment_id)
    WHERE converted_appointment_id IS NOT NULL;

COMMENT ON COLUMN public.appointments.waitlist_entry_id IS
    'Optional originating waitlist entry; conversion should create the appointment and update the entry in one transaction.';

-- 4. Indexes for queue display and tenant-scoped lookups
CREATE INDEX IF NOT EXISTS waitlist_entries_tenant_status_joined_idx
    ON public.waitlist_entries (tenant_id, status, joined_at);

CREATE INDEX IF NOT EXISTS waitlist_entries_tenant_customer_idx
    ON public.waitlist_entries (tenant_id, customer_id)
    WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS waitlist_entries_tenant_service_idx
    ON public.waitlist_entries (tenant_id, service_id)
    WHERE service_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS waitlist_entries_tenant_staff_idx
    ON public.waitlist_entries (tenant_id, staff_id)
    WHERE staff_id IS NOT NULL;

-- 5. Enforce the intended lifecycle:
-- waiting -> notified / converted / expired / cancelled
-- notified -> converted / expired / cancelled
-- converted, expired, and cancelled are terminal states.
CREATE OR REPLACE FUNCTION public.enforce_waitlist_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.status = OLD.status THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'waiting'
       AND NEW.status IN ('notified', 'converted', 'expired', 'cancelled') THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'notified'
       AND NEW.status IN ('converted', 'expired', 'cancelled') THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Invalid waitlist status transition: % -> %',
        OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
END;
$$;

CREATE OR REPLACE FUNCTION public.set_waitlist_notified_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.status = 'notified'
       AND OLD.status IS DISTINCT FROM 'notified'
       AND NEW.notified_at IS NULL THEN
        NEW.notified_at := NOW();
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_waitlist_status_transition
    ON public.waitlist_entries;

CREATE TRIGGER enforce_waitlist_status_transition
    BEFORE UPDATE OF status ON public.waitlist_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_waitlist_status_transition();

DROP TRIGGER IF EXISTS set_waitlist_notified_at
    ON public.waitlist_entries;

CREATE TRIGGER set_waitlist_notified_at
    BEFORE INSERT OR UPDATE OF status ON public.waitlist_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.set_waitlist_notified_at();

DROP TRIGGER IF EXISTS set_waitlist_entries_updated_at
    ON public.waitlist_entries;

CREATE TRIGGER set_waitlist_entries_updated_at
    BEFORE UPDATE ON public.waitlist_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 6. Row-level security: only authenticated tenant members with operational
-- roles may access queue entries. No anonymous/public queue access.
ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS waitlist_entries_operational_access
    ON public.waitlist_entries;

CREATE POLICY waitlist_entries_operational_access
    ON public.waitlist_entries
    FOR ALL
    TO authenticated
    USING (
        public.is_platform_admin()
        OR EXISTS (
            SELECT 1
            FROM public.tenant_memberships tm
            WHERE tm.tenant_id = waitlist_entries.tenant_id
              AND tm.profile_id = auth.uid()
              AND tm.role IN ('owner', 'admin', 'receptionist', 'staff')
        )
    )
    WITH CHECK (
        public.is_platform_admin()
        OR EXISTS (
            SELECT 1
            FROM public.tenant_memberships tm
            WHERE tm.tenant_id = waitlist_entries.tenant_id
              AND tm.profile_id = auth.uid()
              AND tm.role IN ('owner', 'admin', 'receptionist', 'staff')
        )
    );

REVOKE ALL ON TABLE public.waitlist_entries FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
    ON TABLE public.waitlist_entries TO authenticated;

-- The existing appointments policies still govern appointment access.
-- These column grants only permit authenticated callers to use the new link
-- column; they do not bypass appointments RLS.
GRANT SELECT (waitlist_entry_id)
    ON public.appointments TO authenticated;

GRANT INSERT (waitlist_entry_id)
    ON public.appointments TO authenticated;

GRANT UPDATE (waitlist_entry_id)
    ON public.appointments TO authenticated;

-- 7. Supabase Realtime publication. Skip safely if the publication is absent,
-- and avoid adding the table twice.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_publication
        WHERE pubname = 'supabase_realtime'
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'waitlist_entries'
    ) THEN
        ALTER PUBLICATION supabase_realtime
            ADD TABLE public.waitlist_entries;
    END IF;
END
$$;

COMMENT ON TABLE public.waitlist_entries IS
    'Private tenant-scoped walk-in queue. Public websites must not write directly to this table.';

-- ----------------------------------------------------------------------------
-- 8. Operational authorization helper
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_tenant_staff_access(target_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT (
        public.is_platform_admin()
        OR EXISTS (
            SELECT 1
            FROM public.tenant_memberships tm
            WHERE tm.tenant_id = target_tenant_id
              AND tm.profile_id = auth.uid()
              AND tm.role IN ('owner', 'admin', 'receptionist', 'staff')
        )
    );
$$;

GRANT EXECUTE ON FUNCTION public.check_tenant_staff_access(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 9. Atomic RPC: Convert Waiting-list Entry to Appointment
-- ----------------------------------------------------------------------------
-- Implements the atomic conversion transaction pattern:
-- 1) Locks the waitlist entry row FOR UPDATE.
-- 2) Verifies status is 'waiting' or 'notified'.
-- 3) Resolves/creates customer record.
-- 4) Guards against staff/resource conflicts.
-- 5) Inserts into appointments with status 'checked_in'.
-- 6) Inserts into appointment_services and resource_allocations.
-- 7) Sets waitlist_entries.status = 'converted' and links converted_appointment_id.
CREATE OR REPLACE FUNCTION public.convert_waitlist_to_appointment(
    p_tenant_id UUID,
    p_waitlist_entry_id UUID,
    p_staff_id UUID,
    p_resource_id UUID DEFAULT NULL,
    p_starts_at TIMESTAMPTZ DEFAULT NULL,
    p_duration_minutes INT DEFAULT 60,
    p_service_id UUID DEFAULT NULL,
    p_price_cents INT DEFAULT 45000,
    p_notes TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL,
    p_initial_status public.appointment_status DEFAULT 'checked_in'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_entry RECORD;
    v_ends_at TIMESTAMPTZ;
    v_customer_id UUID;
    v_final_service_id UUID;
    v_appointment_id UUID;
    v_starts_at TIMESTAMPTZ;
BEGIN
    -- Authorization check
    IF NOT public.check_tenant_staff_access(p_tenant_id) THEN
        RAISE EXCEPTION 'Unauthorized: only active tenant staff or owners can assign queue slots.'
            USING ERRCODE = '42501';
    END IF;

    -- Time calculation & validation
    v_starts_at := COALESCE(p_starts_at, NOW());
    v_ends_at := v_starts_at + (GREATEST(COALESCE(p_duration_minutes, 60), 1) * INTERVAL '1 minute');

    IF v_ends_at <= v_starts_at THEN
        RAISE EXCEPTION 'Invalid appointment duration: end time must be after start time.'
            USING ERRCODE = 'check_violation';
    END IF;

    -- 1. Lock the waitlist entry row to prevent concurrent assignment
    SELECT id, tenant_id, customer_id, guest_name, guest_phone, service_id, staff_id, status
    INTO v_entry
    FROM public.waitlist_entries
    WHERE id = p_waitlist_entry_id
      AND tenant_id = p_tenant_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Waiting-list entry % not found for tenant %.', p_waitlist_entry_id, p_tenant_id
            USING ERRCODE = 'data_exception';
    END IF;

    IF v_entry.status NOT IN ('waiting', 'notified') THEN
        RAISE EXCEPTION 'Waiting-list entry has already been %.', v_entry.status
            USING ERRCODE = 'check_violation';
    END IF;

    -- 2. Resolve or create customer record
    v_customer_id := v_entry.customer_id;
    IF v_customer_id IS NULL AND NULLIF(BTRIM(v_entry.guest_name), '') IS NOT NULL THEN
        -- Check for existing customer by phone or name
        IF NULLIF(BTRIM(v_entry.guest_phone), '') IS NOT NULL THEN
            SELECT id INTO v_customer_id
            FROM public.customers
            WHERE tenant_id = p_tenant_id
              AND phone = BTRIM(v_entry.guest_phone)
            LIMIT 1;
        END IF;

        IF v_customer_id IS NULL THEN
            SELECT id INTO v_customer_id
            FROM public.customers
            WHERE tenant_id = p_tenant_id
              AND full_name = BTRIM(v_entry.guest_name)
            LIMIT 1;
        END IF;

        IF v_customer_id IS NULL THEN
            INSERT INTO public.customers (
                tenant_id,
                full_name,
                phone
            ) VALUES (
                p_tenant_id,
                BTRIM(v_entry.guest_name),
                NULLIF(BTRIM(v_entry.guest_phone), '')
            ) RETURNING id INTO v_customer_id;
        END IF;
    END IF;

    -- 3. Resolve service
    v_final_service_id := COALESCE(p_service_id, v_entry.service_id);

    -- 4. Guard against staff overlapping bookings (blocking statuses)
    IF EXISTS (
        SELECT 1
        FROM public.appointments
        WHERE tenant_id = p_tenant_id
          AND staff_id = p_staff_id
          AND status NOT IN ('cancelled', 'rejected', 'no_show')
          AND starts_at < v_ends_at
          AND ends_at > v_starts_at
    ) THEN
        RAISE EXCEPTION 'The selected staff member already has an overlapping booking for this time window.'
            USING ERRCODE = 'check_violation';
    END IF;

    -- 5. Guard against resource overlapping allocations
    IF p_resource_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1
            FROM public.resource_allocations
            WHERE tenant_id = p_tenant_id
              AND resource_id = p_resource_id
              AND starts_at < v_ends_at
              AND ends_at > v_starts_at
        ) THEN
            RAISE EXCEPTION 'The selected resource is already allocated for another booking during this time window.'
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    -- 6. Insert Appointment (default status 'checked_in')
    INSERT INTO public.appointments (
        tenant_id,
        customer_id,
        staff_id,
        waitlist_entry_id,
        starts_at,
        ends_at,
        timezone,
        status,
        source,
        total_cents,
        notes,
        created_by
    ) VALUES (
        p_tenant_id,
        v_customer_id,
        p_staff_id,
        p_waitlist_entry_id,
        v_starts_at,
        v_ends_at,
        'Asia/Manila',
        COALESCE(p_initial_status, 'checked_in'),
        'walk_in',
        GREATEST(COALESCE(p_price_cents, 0), 0),
        p_notes,
        COALESCE(p_created_by, auth.uid())
    ) RETURNING id INTO v_appointment_id;

    -- 7. Insert Appointment Service Line Item if service resolved
    IF v_final_service_id IS NOT NULL THEN
        INSERT INTO public.appointment_services (
            tenant_id,
            appointment_id,
            service_id,
            staff_id,
            price_cents,
            duration_minutes
        ) VALUES (
            p_tenant_id,
            v_appointment_id,
            v_final_service_id,
            p_staff_id,
            GREATEST(COALESCE(p_price_cents, 0), 0),
            GREATEST(COALESCE(p_duration_minutes, 60), 1)
        );
    END IF;

    -- 8. Reserve Resource Allocation if resource specified
    IF p_resource_id IS NOT NULL THEN
        INSERT INTO public.resource_allocations (
            tenant_id,
            resource_id,
            appointment_id,
            starts_at,
            ends_at
        ) VALUES (
            p_tenant_id,
            p_resource_id,
            v_appointment_id,
            v_starts_at,
            v_ends_at
        );
    END IF;

    -- 9. Update Waitlist Entry to 'converted'
    UPDATE public.waitlist_entries
    SET status = 'converted',
        converted_appointment_id = v_appointment_id,
        staff_id = p_staff_id,
        updated_at = NOW()
    WHERE id = p_waitlist_entry_id
      AND tenant_id = p_tenant_id;

    -- Return JSON payload
    RETURN jsonb_build_object(
        'appointment_id', v_appointment_id,
        'waitlist_entry_id', p_waitlist_entry_id,
        'starts_at', v_starts_at,
        'ends_at', v_ends_at,
        'staff_id', p_staff_id,
        'resource_id', p_resource_id,
        'status', COALESCE(p_initial_status, 'checked_in')
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.convert_waitlist_to_appointment TO authenticated;

-- ----------------------------------------------------------------------------
-- 10. Atomic RPC: Create Walk-in Direct Appointment
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_walkin_direct_appointment(
    p_tenant_id UUID,
    p_customer_name TEXT,
    p_customer_email TEXT DEFAULT NULL,
    p_customer_phone TEXT DEFAULT NULL,
    p_staff_id UUID DEFAULT NULL,
    p_service_id UUID DEFAULT NULL,
    p_resource_id UUID DEFAULT NULL,
    p_starts_at TIMESTAMPTZ DEFAULT NULL,
    p_duration_minutes INT DEFAULT 60,
    p_price_cents INT DEFAULT 45000,
    p_notes TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL,
    p_initial_status public.appointment_status DEFAULT 'checked_in'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_ends_at TIMESTAMPTZ;
    v_customer_id UUID;
    v_staff_id UUID;
    v_appointment_id UUID;
    v_starts_at TIMESTAMPTZ;
BEGIN
    -- Authorization check
    IF NOT public.check_tenant_staff_access(p_tenant_id) THEN
        RAISE EXCEPTION 'Unauthorized: only active tenant staff or owners can create walk-in appointments.'
            USING ERRCODE = '42501';
    END IF;

    IF NULLIF(BTRIM(p_customer_name), '') IS NULL THEN
        RAISE EXCEPTION 'Customer name is required for walk-in appointment.'
            USING ERRCODE = 'check_violation';
    END IF;

    v_starts_at := COALESCE(p_starts_at, NOW());
    v_ends_at := v_starts_at + (GREATEST(COALESCE(p_duration_minutes, 60), 1) * INTERVAL '1 minute');

    -- Resolve staff
    v_staff_id := p_staff_id;
    IF v_staff_id IS NULL THEN
        SELECT id INTO v_staff_id
        FROM public.staff_members
        WHERE tenant_id = p_tenant_id
          AND active = TRUE
        ORDER BY sort_order ASC
        LIMIT 1;
    END IF;

    IF v_staff_id IS NULL THEN
        RAISE EXCEPTION 'No active staff member found for this tenant.'
            USING ERRCODE = 'data_exception';
    END IF;

    -- Guard against staff overlapping bookings
    IF EXISTS (
        SELECT 1
        FROM public.appointments
        WHERE tenant_id = p_tenant_id
          AND staff_id = v_staff_id
          AND status NOT IN ('cancelled', 'rejected', 'no_show')
          AND starts_at < v_ends_at
          AND ends_at > v_starts_at
    ) THEN
        RAISE EXCEPTION 'The selected staff member already has an overlapping booking for this time window.'
            USING ERRCODE = 'check_violation';
    END IF;

    -- Guard against resource overlapping allocations
    IF p_resource_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1
            FROM public.resource_allocations
            WHERE tenant_id = p_tenant_id
              AND resource_id = p_resource_id
              AND starts_at < v_ends_at
              AND ends_at > v_starts_at
        ) THEN
            RAISE EXCEPTION 'The selected resource is already allocated for another booking during this time window.'
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    -- Resolve customer
    IF NULLIF(BTRIM(p_customer_phone), '') IS NOT NULL THEN
        SELECT id INTO v_customer_id
        FROM public.customers
        WHERE tenant_id = p_tenant_id
          AND phone = BTRIM(p_customer_phone)
        LIMIT 1;
    END IF;

    IF v_customer_id IS NULL THEN
        SELECT id INTO v_customer_id
        FROM public.customers
        WHERE tenant_id = p_tenant_id
          AND full_name = BTRIM(p_customer_name)
        LIMIT 1;
    END IF;

    IF v_customer_id IS NULL THEN
        INSERT INTO public.customers (
            tenant_id,
            full_name,
            email,
            phone
        ) VALUES (
            p_tenant_id,
            BTRIM(p_customer_name),
            NULLIF(BTRIM(p_customer_email), ''),
            NULLIF(BTRIM(p_customer_phone), '')
        ) RETURNING id INTO v_customer_id;
    END IF;

    -- Create appointment
    INSERT INTO public.appointments (
        tenant_id,
        customer_id,
        staff_id,
        starts_at,
        ends_at,
        timezone,
        status,
        source,
        total_cents,
        notes,
        created_by
    ) VALUES (
        p_tenant_id,
        v_customer_id,
        v_staff_id,
        v_starts_at,
        v_ends_at,
        'Asia/Manila',
        COALESCE(p_initial_status, 'checked_in'),
        'walk_in',
        GREATEST(COALESCE(p_price_cents, 0), 0),
        p_notes,
        COALESCE(p_created_by, auth.uid())
    ) RETURNING id INTO v_appointment_id;

    -- Insert service line item
    IF p_service_id IS NOT NULL THEN
        INSERT INTO public.appointment_services (
            tenant_id,
            appointment_id,
            service_id,
            staff_id,
            price_cents,
            duration_minutes
        ) VALUES (
            p_tenant_id,
            v_appointment_id,
            p_service_id,
            v_staff_id,
            GREATEST(COALESCE(p_price_cents, 0), 0),
            GREATEST(COALESCE(p_duration_minutes, 60), 1)
        );
    END IF;

    -- Reserve resource allocation
    IF p_resource_id IS NOT NULL THEN
        INSERT INTO public.resource_allocations (
            tenant_id,
            resource_id,
            appointment_id,
            starts_at,
            ends_at
        ) VALUES (
            p_tenant_id,
            p_resource_id,
            v_appointment_id,
            v_starts_at,
            v_ends_at
        );
    END IF;

    RETURN jsonb_build_object(
        'appointment_id', v_appointment_id,
        'starts_at', v_starts_at,
        'ends_at', v_ends_at,
        'staff_id', v_staff_id,
        'customer_id', v_customer_id,
        'status', COALESCE(p_initial_status, 'checked_in')
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_walkin_direct_appointment TO authenticated;

COMMIT;