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

COMMIT;

-- Conversion transaction pattern:
-- 1) SELECT the waitlist row FOR UPDATE.
-- 2) INSERT the appointment with waitlist_entry_id = the entry id.
-- 3) UPDATE the same entry to status = 'converted' and set
--    converted_appointment_id = the new appointment id.
-- Commit all three steps together. The unique indexes prevent a second
-- appointment from claiming the same entry or two entries claiming one
-- appointment. Application/server logic must perform conversion atomically.