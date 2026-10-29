-- ============================================================================
-- Fides — Scheduling core
-- Migration: 00005_appointments.sql
-- Purpose: appointments, service lines, status audit, QR passes, notifications,
--          and the resource-allocation appointment relationship.
-- Requires prior migrations: tenants/profiles/tenant_memberships, services,
--          staff_members, resource_allocations, and set_updated_at().
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enums (idempotent creation)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typname = 'appointment_status'
    ) THEN
        CREATE TYPE public.appointment_status AS ENUM (
            'pending_approval', 'confirmed', 'checked_in', 'in_service',
            'completed', 'cancelled', 'rejected', 'expired', 'no_show'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typname = 'booking_source'
    ) THEN
        CREATE TYPE public.booking_source AS ENUM ('online', 'walk_in', 'phone');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typname = 'notification_channel'
    ) THEN
        CREATE TYPE public.notification_channel AS ENUM ('in_app', 'email', 'sms');
    END IF;
END $$;

GRANT USAGE ON TYPE public.appointment_status TO authenticated;
GRANT USAGE ON TYPE public.booking_source TO authenticated;
GRANT USAGE ON TYPE public.notification_channel TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Parent keys required for tenant-safe composite foreign keys
--    These are additive; the earlier migrations remain unchanged.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.staff_members'::regclass
          AND conname = 'staff_members_tenant_id_id_key'
    ) THEN
        ALTER TABLE public.staff_members
            ADD CONSTRAINT staff_members_tenant_id_id_key UNIQUE (tenant_id, id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.services'::regclass
          AND conname = 'services_tenant_id_id_key'
    ) THEN
        ALTER TABLE public.services
            ADD CONSTRAINT services_tenant_id_id_key UNIQUE (tenant_id, id);
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Appointments
--    customer_id intentionally has no FK until migration 00006 (DB-06).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL
        REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id UUID,
    staff_id UUID NOT NULL,
    source public.booking_source NOT NULL DEFAULT 'online',
    status public.appointment_status NOT NULL DEFAULT 'pending_approval',
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    timezone TEXT,
    notes TEXT,
    total_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT appointments_time_range_check CHECK (ends_at > starts_at),
    CONSTRAINT appointments_tenant_id_id_key UNIQUE (tenant_id, id),
    CONSTRAINT appointments_tenant_staff_fkey
        FOREIGN KEY (tenant_id, staff_id)
        REFERENCES public.staff_members(tenant_id, id)
        ON DELETE RESTRICT
);

-- ---------------------------------------------------------------------------
-- 4. Appointment service lines (price/duration snapshots at booking time)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointment_services (
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    appointment_id UUID NOT NULL,
    service_id UUID NOT NULL,
    staff_id UUID,
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    PRIMARY KEY (appointment_id, service_id),
    CONSTRAINT appointment_services_appointment_fkey
        FOREIGN KEY (tenant_id, appointment_id)
        REFERENCES public.appointments(tenant_id, id)
        ON DELETE CASCADE,
    CONSTRAINT appointment_services_service_fkey
        FOREIGN KEY (tenant_id, service_id)
        REFERENCES public.services(tenant_id, id)
        ON DELETE RESTRICT,
    CONSTRAINT appointment_services_staff_fkey
        FOREIGN KEY (tenant_id, staff_id)
        REFERENCES public.staff_members(tenant_id, id)
        ON DELETE RESTRICT
);

-- ---------------------------------------------------------------------------
-- 5. Immutable appointment status audit trail
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointment_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    appointment_id UUID NOT NULL,
    from_status public.appointment_status NOT NULL,
    to_status public.appointment_status NOT NULL,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    note TEXT,
    CONSTRAINT appointment_status_history_appointment_fkey
        FOREIGN KEY (tenant_id, appointment_id)
        REFERENCES public.appointments(tenant_id, id)
        ON DELETE CASCADE,
    CONSTRAINT appointment_status_history_transition_check
        CHECK (from_status <> to_status)
);

-- Trigger writes history in the same transaction as the status update.
-- If the history insert fails, the appointment status update also rolls back.
CREATE OR REPLACE FUNCTION public.log_appointment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.appointment_status_history (
            tenant_id, appointment_id, from_status, to_status, changed_by, changed_at
        ) VALUES (
            NEW.tenant_id,
            NEW.id,
            OLD.status,
            NEW.status,
            auth.uid(),
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS appointments_status_audit_trg ON public.appointments;
CREATE TRIGGER appointments_status_audit_trg
AFTER UPDATE OF status ON public.appointments
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.log_appointment_status_change();

-- The trigger is the only intended write path to the audit table.
REVOKE ALL ON FUNCTION public.log_appointment_status_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_appointment_status_change() FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. QR check-in passes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.qr_passes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    appointment_id UUID NOT NULL,
    token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    CONSTRAINT qr_passes_appointment_fkey
        FOREIGN KEY (tenant_id, appointment_id)
        REFERENCES public.appointments(tenant_id, id)
        ON DELETE CASCADE,
    CONSTRAINT qr_passes_expiry_check CHECK (expires_at > issued_at)
);

-- ---------------------------------------------------------------------------
-- 7. In-app and outbound notification records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::JSONB,
    channel public.notification_channel NOT NULL DEFAULT 'in_app',
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT notifications_recipient_membership_fkey
        FOREIGN KEY (tenant_id, recipient_id)
        REFERENCES public.tenant_memberships(tenant_id, profile_id)
        ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- 8. Resolve resource_allocations appointment FK (DB-05)
--    Keep the explicitly requested FK and add tenant consistency as well.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.resource_allocations'::regclass
          AND conname = 'resource_allocations_appointment_id_fkey'
    ) THEN
        ALTER TABLE public.resource_allocations
            ADD CONSTRAINT resource_allocations_appointment_id_fkey
            FOREIGN KEY (appointment_id)
            REFERENCES public.appointments(id)
            ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.resource_allocations'::regclass
          AND conname = 'resource_allocations_tenant_appointment_fkey'
    ) THEN
        ALTER TABLE public.resource_allocations
            ADD CONSTRAINT resource_allocations_tenant_appointment_fkey
            FOREIGN KEY (tenant_id, appointment_id)
            REFERENCES public.appointments(tenant_id, id)
            ON DELETE CASCADE;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 9. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS appointments_tenant_starts_at_idx
    ON public.appointments (tenant_id, starts_at);
CREATE INDEX IF NOT EXISTS appointments_staff_starts_at_idx
    ON public.appointments (staff_id, starts_at);
CREATE INDEX IF NOT EXISTS appointments_tenant_customer_idx
    ON public.appointments (tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS appointments_tenant_status_starts_at_idx
    ON public.appointments (tenant_id, status, starts_at);
CREATE INDEX IF NOT EXISTS appointments_created_by_idx
    ON public.appointments (created_by);

CREATE INDEX IF NOT EXISTS appointment_services_tenant_id_idx
    ON public.appointment_services (tenant_id);
CREATE INDEX IF NOT EXISTS appointment_services_tenant_service_idx
    ON public.appointment_services (tenant_id, service_id);
CREATE INDEX IF NOT EXISTS appointment_services_tenant_staff_idx
    ON public.appointment_services (tenant_id, staff_id);

CREATE INDEX IF NOT EXISTS appointment_status_history_appointment_changed_at_idx
    ON public.appointment_status_history (appointment_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS appointment_status_history_tenant_id_idx
    ON public.appointment_status_history (tenant_id);
CREATE INDEX IF NOT EXISTS appointment_status_history_changed_by_idx
    ON public.appointment_status_history (changed_by);

CREATE INDEX IF NOT EXISTS qr_passes_tenant_appointment_idx
    ON public.qr_passes (tenant_id, appointment_id);
CREATE INDEX IF NOT EXISTS qr_passes_expires_at_idx
    ON public.qr_passes (expires_at);

CREATE INDEX IF NOT EXISTS notifications_tenant_recipient_created_idx
    ON public.notifications (tenant_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_recipient_unread_idx
    ON public.notifications (recipient_id, created_at DESC)
    WHERE read_at IS NULL;

-- Existing resource_allocations is created in 00004; ensure the ticket's
-- requested availability index exists even if its original index was omitted.
CREATE INDEX IF NOT EXISTS resource_allocations_tenant_starts_ends_idx
    ON public.resource_allocations (tenant_id, starts_at, ends_at);

-- ---------------------------------------------------------------------------
-- 10. Timestamp trigger for appointments
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_appointments_updated_at ON public.appointments;
CREATE TRIGGER set_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 11. Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Recreate only policies owned by this migration, preserving policies from
-- earlier migrations and avoiding broad policy deletion.
DROP POLICY IF EXISTS appointments_operational_access ON public.appointments;
CREATE POLICY appointments_operational_access
ON public.appointments
FOR ALL TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = appointments.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin', 'receptionist', 'staff')
    )
)
WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = appointments.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin', 'receptionist', 'staff')
    )
);

DROP POLICY IF EXISTS appointment_services_operational_access ON public.appointment_services;
CREATE POLICY appointment_services_operational_access
ON public.appointment_services
FOR ALL TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.appointments a
        JOIN public.tenant_memberships tm ON tm.tenant_id = a.tenant_id
        WHERE a.tenant_id = appointment_services.tenant_id
          AND a.id = appointment_services.appointment_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin', 'receptionist', 'staff')
    )
)
WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = appointment_services.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin', 'receptionist', 'staff')
    )
);

DROP POLICY IF EXISTS appointment_status_history_parent_read ON public.appointment_status_history;
CREATE POLICY appointment_status_history_parent_read
ON public.appointment_status_history
FOR SELECT TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = appointment_status_history.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin', 'receptionist', 'staff')
    )
);

DROP POLICY IF EXISTS qr_passes_parent_access ON public.qr_passes;
CREATE POLICY qr_passes_parent_access
ON public.qr_passes
FOR ALL TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = qr_passes.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin', 'receptionist', 'staff')
    )
)
WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = qr_passes.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin', 'receptionist', 'staff')
    )
);

DROP POLICY IF EXISTS notifications_recipient_or_admin_read ON public.notifications;
CREATE POLICY notifications_recipient_or_admin_read
ON public.notifications
FOR SELECT TO authenticated
USING (
    recipient_id = auth.uid()
    OR public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = notifications.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin')
    )
);

DROP POLICY IF EXISTS notifications_recipient_update ON public.notifications;
CREATE POLICY notifications_recipient_update
ON public.notifications
FOR UPDATE TO authenticated
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());

-- No anonymous policies are defined. Anonymous callers have no direct access.

-- ---------------------------------------------------------------------------
-- 12. Grants
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.appointments FROM anon;
REVOKE ALL ON public.appointment_services FROM anon;
REVOKE ALL ON public.appointment_status_history FROM anon;
REVOKE ALL ON public.qr_passes FROM anon;
REVOKE ALL ON public.notifications FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_services TO authenticated;
GRANT SELECT ON public.appointment_status_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qr_passes TO authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;

-- Ensure audit history cannot be directly altered by application roles.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.appointment_status_history
FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 13. Realtime publication (idempotent)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
              AND schemaname = 'public'
              AND tablename = 'appointments'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
              AND schemaname = 'public'
              AND tablename = 'notifications'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
        END IF;
    ELSE
        RAISE NOTICE 'Publication supabase_realtime does not exist; Realtime tables were not added.';
    END IF;
END $$;

-- End migration. All DDL and trigger-created audit rows participate in the
-- surrounding PostgreSQL transaction; status updates and audit inserts are atomic.
