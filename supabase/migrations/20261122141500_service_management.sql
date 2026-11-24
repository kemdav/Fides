-- ============================================================================
-- Fides — Service Management Module Enhancements
-- Migration: 20261122141500_service_management.sql
-- Adds archive flags, package duration, add-on descriptions, and updates RLS.
-- ============================================================================

-- 1. Add is_archived to services
ALTER TABLE public.services
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Add duration_minutes and is_archived to packages
ALTER TABLE public.packages
    ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0);

ALTER TABLE public.packages
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Add description and is_archived to service_addons
ALTER TABLE public.service_addons
    ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.service_addons
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

-- 4. Indexes for performance on filtered queries
CREATE INDEX IF NOT EXISTS services_tenant_active_archived_idx
    ON public.services(tenant_id, active, is_archived);

CREATE INDEX IF NOT EXISTS packages_tenant_active_archived_idx
    ON public.packages(tenant_id, active, is_archived);

CREATE INDEX IF NOT EXISTS service_addons_tenant_active_archived_idx
    ON public.service_addons(tenant_id, active, is_archived);

-- 5. Update public read policies to strictly exclude archived records
DROP POLICY IF EXISTS services_public_read ON public.services;
CREATE POLICY services_public_read ON public.services
    FOR SELECT TO anon, authenticated
    USING (active AND NOT is_archived AND EXISTS (
        SELECT 1 FROM public.tenants t
        WHERE t.id = services.tenant_id AND t.status = 'active'
    ));

DROP POLICY IF EXISTS packages_public_read ON public.packages;
CREATE POLICY packages_public_read ON public.packages
    FOR SELECT TO anon, authenticated
    USING (active AND NOT is_archived AND EXISTS (
        SELECT 1 FROM public.tenants t
        WHERE t.id = packages.tenant_id AND t.status = 'active'
    ));

DROP POLICY IF EXISTS service_addons_public_read ON public.service_addons;
CREATE POLICY service_addons_public_read ON public.service_addons
    FOR SELECT TO anon, authenticated
    USING (active AND NOT is_archived AND EXISTS (
        SELECT 1 FROM public.tenants t
        WHERE t.id = service_addons.tenant_id AND t.status = 'active'
    ));
