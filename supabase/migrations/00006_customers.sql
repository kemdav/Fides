-- ============================================================================
-- Fides — Customer records, internal notes, and reviews
-- Migration: 00006_customers.sql
--
-- Depends on public.tenants, public.profiles, public.tenant_memberships,
-- public.appointments, public.staff_members, public.is_platform_admin(),
-- and public.set_updated_at().
-- ============================================================================

BEGIN;

-- 1. Review status enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'review_status' AND n.nspname = 'public'
    ) THEN
        CREATE TYPE public.review_status AS ENUM ('pending', 'published', 'hidden');
    END IF;
END
$$;

-- 2. Customer records. Multiple guest rows may have NULL profile_id.
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    birthday DATE,
    marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT customers_tenant_profile_key UNIQUE (tenant_id, profile_id),
    CONSTRAINT customers_tenant_id_id_key UNIQUE (tenant_id, id),
    CONSTRAINT customers_full_name_nonblank CHECK (length(btrim(full_name)) > 0)
);

CREATE INDEX IF NOT EXISTS customers_tenant_email_idx
    ON public.customers (tenant_id, email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS customers_tenant_phone_idx
    ON public.customers (tenant_id, phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS customers_profile_id_idx
    ON public.customers (profile_id) WHERE profile_id IS NOT NULL;

-- 3. Internal notes: tenant-aware customer FK prevents cross-tenant references.
CREATE TABLE IF NOT EXISTS public.customer_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT customer_notes_body_nonblank CHECK (length(btrim(body)) > 0),
    CONSTRAINT customer_notes_customer_fkey
        FOREIGN KEY (tenant_id, customer_id)
        REFERENCES public.customers (tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS customer_notes_customer_created_idx
    ON public.customer_notes (tenant_id, customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS customer_notes_author_idx
    ON public.customer_notes (author_id);

-- 4. Reviews. Composite FKs ensure referenced rows belong to the same tenant.
-- One review per appointment; PostgreSQL permits multiple NULL appointment_ids.
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL,
    appointment_id UUID,
    staff_id UUID,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    status public.review_status NOT NULL DEFAULT 'pending',
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT reviews_tenant_id_id_key UNIQUE (tenant_id, id),
    CONSTRAINT reviews_one_per_appointment_key UNIQUE (appointment_id),
    CONSTRAINT reviews_customer_fkey
        FOREIGN KEY (tenant_id, customer_id)
        REFERENCES public.customers (tenant_id, id) ON DELETE CASCADE,
    CONSTRAINT reviews_appointment_fkey
        FOREIGN KEY (tenant_id, appointment_id)
        REFERENCES public.appointments (tenant_id, id)
        ON DELETE SET NULL (appointment_id),
    CONSTRAINT reviews_staff_fkey
        FOREIGN KEY (tenant_id, staff_id)
        REFERENCES public.staff_members (tenant_id, id)
        ON DELETE SET NULL (staff_id),
    CONSTRAINT reviews_published_timestamp_check
        CHECK (status <> 'published' OR published_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS reviews_tenant_status_published_idx
    ON public.reviews (tenant_id, status, published_at DESC);
CREATE INDEX IF NOT EXISTS reviews_customer_created_idx
    ON public.reviews (tenant_id, customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reviews_staff_created_idx
    ON public.reviews (tenant_id, staff_id, created_at DESC) WHERE staff_id IS NOT NULL;

-- 5. Resolve deferred appointment -> customer FK. Guest bookings remain valid.
ALTER TABLE public.appointments
    DROP CONSTRAINT IF EXISTS appointments_customer_id_fkey;
ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.customers (id) ON DELETE SET NULL;
COMMENT ON COLUMN public.appointments.customer_id IS
    'Nullable customer record reference; NULL supports guest bookings and customer deletion.';

-- 6. updated_at triggers
DROP TRIGGER IF EXISTS customers_set_updated_at ON public.customers;
CREATE TRIGGER customers_set_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS reviews_set_updated_at ON public.reviews;
CREATE TRIGGER reviews_set_updated_at
    BEFORE UPDATE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 8. Customers: tenant operational access plus customer self-service.
DROP POLICY IF EXISTS customers_operational_manage ON public.customers;
CREATE POLICY customers_operational_manage ON public.customers
FOR ALL TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = customers.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin', 'receptionist', 'staff')
    )
)
WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = customers.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin', 'receptionist', 'staff')
    )
);
DROP POLICY IF EXISTS customers_self_select ON public.customers;
CREATE POLICY customers_self_select ON public.customers
FOR SELECT TO authenticated USING (profile_id = auth.uid());
DROP POLICY IF EXISTS customers_self_update ON public.customers;
CREATE POLICY customers_self_update ON public.customers
FOR UPDATE TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- 9. Notes are accessible only to operational members / platform admins.
DROP POLICY IF EXISTS customer_notes_operational_manage ON public.customer_notes;
CREATE POLICY customer_notes_operational_manage ON public.customer_notes
FOR ALL TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = customer_notes.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin', 'receptionist', 'staff')
    )
)
WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = customer_notes.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin', 'receptionist', 'staff')
    )
);

-- 10. Reviews: public published-only reads; owner/admin can see all and moderate.
DROP POLICY IF EXISTS reviews_public_read_published ON public.reviews;
CREATE POLICY reviews_public_read_published ON public.reviews
FOR SELECT TO anon, authenticated USING (status = 'published');
DROP POLICY IF EXISTS reviews_owner_admin_read_all ON public.reviews;
CREATE POLICY reviews_owner_admin_read_all ON public.reviews
FOR SELECT TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = reviews.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin')
    )
);
DROP POLICY IF EXISTS reviews_customer_insert_completed_appointment ON public.reviews;
CREATE POLICY reviews_customer_insert_completed_appointment ON public.reviews
FOR INSERT TO authenticated
WITH CHECK (
    status = 'pending'
    AND published_at IS NULL
    AND appointment_id IS NOT NULL
    AND EXISTS (
        SELECT 1
        FROM public.customers c
        JOIN public.appointments a
          ON a.tenant_id = c.tenant_id AND a.customer_id = c.id
        WHERE c.id = reviews.customer_id
          AND c.tenant_id = reviews.tenant_id
          AND c.profile_id = auth.uid()
          AND a.id = reviews.appointment_id
          AND a.status = 'completed'
          AND (reviews.staff_id IS NULL OR a.staff_id = reviews.staff_id)
    )
);
DROP POLICY IF EXISTS reviews_owner_admin_moderate ON public.reviews;
CREATE POLICY reviews_owner_admin_moderate ON public.reviews
FOR UPDATE TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = reviews.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = reviews.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin')
    )
);

-- 11. Least-privilege grants. RLS alone does not replace SQL privileges.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
REVOKE ALL ON public.customers, public.customer_notes, public.reviews FROM anon, authenticated;

-- Authenticated staff CRUD is subject to RLS. Self-service can update only
-- these allowed fields; tenant_id/profile_id and timestamps are not writable.
GRANT SELECT, INSERT, DELETE ON public.customers TO authenticated;
GRANT UPDATE (full_name, email, phone, birthday, marketing_opt_in)
ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_notes TO authenticated;
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT ON public.reviews TO authenticated;
GRANT UPDATE (status, published_at) ON public.reviews TO authenticated;

COMMIT;

-- No Realtime publication changes are required for this migration.
