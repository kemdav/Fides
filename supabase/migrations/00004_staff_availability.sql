-- ============================================================================
-- Fides — Staff, availability, and bookable resources
-- Migration: 00004_staff_availability.sql
-- Depends on: baseline tenant/profile helpers and catalog migration (00003).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enums (idempotent)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typname = 'commission_type'
    ) THEN
        CREATE TYPE public.commission_type AS ENUM ('fixed', 'percentage');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typname = 'resource_type'
    ) THEN
        CREATE TYPE public.resource_type AS ENUM ('room', 'chair', 'equipment', 'vehicle', 'other');
    END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 2. Staff members
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    title TEXT,
    bio TEXT,
    image_url TEXT,
    commission_type public.commission_type NOT NULL DEFAULT 'fixed',
    commission_value NUMERIC(12,2) NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT staff_members_tenant_profile_key UNIQUE (tenant_id, profile_id),
    CONSTRAINT staff_members_tenant_id_id_key UNIQUE (tenant_id, id),
    CONSTRAINT staff_members_commission_value_nonnegative CHECK (commission_value >= 0),
    CONSTRAINT staff_members_percentage_commission_range
        CHECK (commission_type <> 'percentage' OR commission_value <= 100)
);

-- ---------------------------------------------------------------------------
-- 3. Staff service skills
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_service_skills (
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL,
    service_id UUID NOT NULL,
    PRIMARY KEY (staff_id, service_id),
    CONSTRAINT staff_service_skills_staff_fkey
        FOREIGN KEY (tenant_id, staff_id)
        REFERENCES public.staff_members(tenant_id, id) ON DELETE CASCADE,
    CONSTRAINT staff_service_skills_service_fkey
        FOREIGN KEY (tenant_id, service_id)
        REFERENCES public.services(tenant_id, id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- 4. Weekly business hours
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    opens_at TIME NOT NULL,
    closes_at TIME NOT NULL,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT business_hours_tenant_day_key UNIQUE (tenant_id, day_of_week),
    CONSTRAINT business_hours_valid_window CHECK (is_closed OR closes_at > opens_at),
    CONSTRAINT business_hours_tenant_id_id_key UNIQUE (tenant_id, id)
);

-- ---------------------------------------------------------------------------
-- 5. Staff shifts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT shifts_valid_window CHECK (ends_at > starts_at),
    CONSTRAINT shifts_tenant_id_id_key UNIQUE (tenant_id, id),
    CONSTRAINT shifts_staff_fkey
        FOREIGN KEY (tenant_id, staff_id)
        REFERENCES public.staff_members(tenant_id, id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- 6. Breaks within shifts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.breaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT breaks_valid_window CHECK (ends_at > starts_at),
    CONSTRAINT breaks_shift_fkey
        FOREIGN KEY (tenant_id, shift_id)
        REFERENCES public.shifts(tenant_id, id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- 7. Staff leave
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL,
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    reason TEXT,
    approved BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT leaves_valid_window CHECK (ends_on >= starts_on),
    CONSTRAINT leaves_staff_fkey
        FOREIGN KEY (tenant_id, staff_id)
        REFERENCES public.staff_members(tenant_id, id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- 8. Business closures
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_closures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    reason TEXT,
    CONSTRAINT business_closures_valid_window CHECK (ends_at > starts_at)
);

-- ---------------------------------------------------------------------------
-- 9. Bookable resources
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type public.resource_type NOT NULL DEFAULT 'room',
    capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity > 0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT resources_tenant_id_id_key UNIQUE (tenant_id, id)
);

-- ---------------------------------------------------------------------------
-- 10. Service-to-resource requirements
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_resources (
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    service_id UUID NOT NULL,
    resource_id UUID NOT NULL,
    PRIMARY KEY (service_id, resource_id),
    CONSTRAINT service_resources_service_fkey
        FOREIGN KEY (tenant_id, service_id)
        REFERENCES public.services(tenant_id, id) ON DELETE CASCADE,
    CONSTRAINT service_resources_resource_fkey
        FOREIGN KEY (tenant_id, resource_id)
        REFERENCES public.resources(tenant_id, id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- 11. Resource allocations
-- appointment_id intentionally has no FK until DB-05.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resource_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL,
    appointment_id UUID,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT resource_allocations_valid_window CHECK (ends_at > starts_at),
    CONSTRAINT resource_allocations_resource_start_key UNIQUE (resource_id, starts_at),
    CONSTRAINT resource_allocations_resource_fkey
        FOREIGN KEY (tenant_id, resource_id)
        REFERENCES public.resources(tenant_id, id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- 12. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS staff_members_tenant_id_idx
    ON public.staff_members (tenant_id);
CREATE INDEX IF NOT EXISTS staff_members_profile_id_idx
    ON public.staff_members (profile_id);
CREATE INDEX IF NOT EXISTS staff_service_skills_tenant_id_idx
    ON public.staff_service_skills (tenant_id);
CREATE INDEX IF NOT EXISTS staff_service_skills_tenant_service_idx
    ON public.staff_service_skills (tenant_id, service_id);
CREATE INDEX IF NOT EXISTS business_hours_tenant_id_idx
    ON public.business_hours (tenant_id);
CREATE INDEX IF NOT EXISTS shifts_tenant_starts_ends_idx
    ON public.shifts (tenant_id, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS shifts_tenant_staff_idx
    ON public.shifts (tenant_id, staff_id);
CREATE INDEX IF NOT EXISTS breaks_tenant_starts_ends_idx
    ON public.breaks (tenant_id, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS breaks_tenant_shift_idx
    ON public.breaks (tenant_id, shift_id);
-- Leaves use date columns (starts_on / ends_on), not timestamp columns.
CREATE INDEX IF NOT EXISTS leaves_tenant_starts_ends_idx
    ON public.leaves (tenant_id, starts_on, ends_on);
CREATE INDEX IF NOT EXISTS leaves_tenant_staff_idx
    ON public.leaves (tenant_id, staff_id);
CREATE INDEX IF NOT EXISTS business_closures_tenant_starts_ends_idx
    ON public.business_closures (tenant_id, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS resources_tenant_id_idx
    ON public.resources (tenant_id);
CREATE INDEX IF NOT EXISTS service_resources_tenant_id_idx
    ON public.service_resources (tenant_id);
CREATE INDEX IF NOT EXISTS service_resources_tenant_resource_idx
    ON public.service_resources (tenant_id, resource_id);
CREATE INDEX IF NOT EXISTS resource_allocations_tenant_starts_ends_idx
    ON public.resource_allocations (tenant_id, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS resource_allocations_tenant_resource_idx
    ON public.resource_allocations (tenant_id, resource_id);
CREATE INDEX IF NOT EXISTS resource_allocations_appointment_id_idx
    ON public.resource_allocations (appointment_id);

-- ---------------------------------------------------------------------------
-- 13. updated_at triggers where the tables have updated_at
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS staff_members_set_updated_at ON public.staff_members;
CREATE TRIGGER staff_members_set_updated_at
    BEFORE UPDATE ON public.staff_members
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS resources_set_updated_at ON public.resources;
CREATE TRIGGER resources_set_updated_at
    BEFORE UPDATE ON public.resources
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS resource_allocations_set_updated_at ON public.resource_allocations;
CREATE TRIGGER resource_allocations_set_updated_at
    BEFORE UPDATE ON public.resource_allocations
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 14. RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_service_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_allocations ENABLE ROW LEVEL SECURITY;

-- Drop this migration's policies before recreating them, so re-runs are safe.
DROP POLICY IF EXISTS staff_members_owner_admin_manage ON public.staff_members;
DROP POLICY IF EXISTS staff_service_skills_owner_admin_manage ON public.staff_service_skills;
DROP POLICY IF EXISTS staff_service_skills_tenant_read ON public.staff_service_skills;
DROP POLICY IF EXISTS business_hours_owner_admin_manage ON public.business_hours;
DROP POLICY IF EXISTS business_hours_tenant_read ON public.business_hours;
DROP POLICY IF EXISTS shifts_owner_admin_manage ON public.shifts;
DROP POLICY IF EXISTS shifts_tenant_read ON public.shifts;
DROP POLICY IF EXISTS breaks_owner_admin_manage ON public.breaks;
DROP POLICY IF EXISTS breaks_tenant_read ON public.breaks;
DROP POLICY IF EXISTS leaves_owner_admin_manage ON public.leaves;
DROP POLICY IF EXISTS leaves_tenant_read ON public.leaves;
DROP POLICY IF EXISTS business_closures_owner_admin_manage ON public.business_closures;
DROP POLICY IF EXISTS business_closures_tenant_read ON public.business_closures;
DROP POLICY IF EXISTS resources_owner_admin_manage ON public.resources;
DROP POLICY IF EXISTS resources_tenant_read ON public.resources;
DROP POLICY IF EXISTS service_resources_owner_admin_manage ON public.service_resources;
DROP POLICY IF EXISTS service_resources_tenant_read ON public.service_resources;
DROP POLICY IF EXISTS resource_allocations_owner_admin_manage ON public.resource_allocations;
DROP POLICY IF EXISTS resource_allocations_tenant_read ON public.resource_allocations;
DROP POLICY IF EXISTS staff_members_public_active_read ON public.staff_members;

-- Public staff profile visibility; column grants below restrict exposed fields.
CREATE POLICY staff_members_public_active_read
ON public.staff_members
FOR SELECT TO anon, authenticated
USING (
    active = TRUE
    AND EXISTS (
        SELECT 1 FROM public.tenants t
        WHERE t.id = staff_members.tenant_id
          AND t.status = 'active'
    )
);

CREATE POLICY staff_service_skills_tenant_read ON public.staff_service_skills
FOR SELECT TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = staff_service_skills.tenant_id
          AND tm.profile_id = auth.uid()
    )
);

CREATE POLICY business_hours_tenant_read ON public.business_hours
FOR SELECT TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = business_hours.tenant_id
          AND tm.profile_id = auth.uid()
    )
);

CREATE POLICY shifts_tenant_read ON public.shifts
FOR SELECT TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = shifts.tenant_id
          AND tm.profile_id = auth.uid()
    )
);

CREATE POLICY breaks_tenant_read ON public.breaks
FOR SELECT TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = breaks.tenant_id
          AND tm.profile_id = auth.uid()
    )
);

CREATE POLICY leaves_tenant_read ON public.leaves
FOR SELECT TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = leaves.tenant_id
          AND tm.profile_id = auth.uid()
    )
);

CREATE POLICY business_closures_tenant_read ON public.business_closures
FOR SELECT TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = business_closures.tenant_id
          AND tm.profile_id = auth.uid()
    )
);

CREATE POLICY resources_tenant_read ON public.resources
FOR SELECT TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = resources.tenant_id
          AND tm.profile_id = auth.uid()
    )
);

CREATE POLICY service_resources_tenant_read ON public.service_resources
FOR SELECT TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = service_resources.tenant_id
          AND tm.profile_id = auth.uid()
    )
);

CREATE POLICY resource_allocations_tenant_read ON public.resource_allocations
FOR SELECT TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = resource_allocations.tenant_id
          AND tm.profile_id = auth.uid()
    )
);

CREATE POLICY staff_members_owner_admin_manage
ON public.staff_members
FOR ALL TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = staff_members.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = staff_members.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin')
    )
);

CREATE POLICY staff_service_skills_owner_admin_manage
ON public.staff_service_skills
FOR ALL TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = staff_service_skills.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = staff_service_skills.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin')
    )
);

CREATE POLICY business_hours_owner_admin_manage
ON public.business_hours
FOR ALL TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = business_hours.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = business_hours.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin')
    )
);

CREATE POLICY shifts_owner_admin_manage
ON public.shifts
FOR ALL TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = shifts.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = shifts.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin')
    )
);

CREATE POLICY breaks_owner_admin_manage
ON public.breaks
FOR ALL TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = breaks.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = breaks.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin')
    )
);

CREATE POLICY leaves_owner_admin_manage
ON public.leaves
FOR ALL TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = leaves.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = leaves.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin')
    )
);

CREATE POLICY business_closures_owner_admin_manage
ON public.business_closures
FOR ALL TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = business_closures.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = business_closures.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin')
    )
);

CREATE POLICY resources_owner_admin_manage
ON public.resources
FOR ALL TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = resources.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = resources.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin')
    )
);

CREATE POLICY service_resources_owner_admin_manage
ON public.service_resources
FOR ALL TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = service_resources.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = service_resources.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin')
    )
);

CREATE POLICY resource_allocations_owner_admin_manage
ON public.resource_allocations
FOR ALL TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = resource_allocations.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = resource_allocations.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin')
    )
);

-- Availability tables have no anonymous policies.

-- ---------------------------------------------------------------------------
-- 15. Grants
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Public staff data only. Do not grant table-level SELECT on staff_members:
-- it would expose commission_type and commission_value.
GRANT SELECT (id, tenant_id, full_name, title, bio, image_url, sort_order)
ON public.staff_members TO anon, authenticated;

-- Authenticated users may modify staff records when RLS permits it. Commission
-- columns are intentionally not readable through SELECT grants.
GRANT INSERT, UPDATE, DELETE ON public.staff_members TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON
    public.staff_service_skills,
    public.business_hours,
    public.shifts,
    public.breaks,
    public.leaves,
    public.business_closures,
    public.resources,
    public.service_resources,
    public.resource_allocations
TO authenticated;

-- No anonymous access to availability or resource-allocation tables.
REVOKE ALL ON
    public.staff_service_skills,
    public.business_hours,
    public.shifts,
    public.breaks,
    public.leaves,
    public.business_closures,
    public.resources,
    public.service_resources,
    public.resource_allocations
FROM anon;

-- Explicitly document the future appointment FK as intentionally omitted.
COMMENT ON COLUMN public.resource_allocations.appointment_id IS
    'Appointment identifier; FK intentionally deferred until migration DB-05.';
