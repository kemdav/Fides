-- ============================================================================
-- Fides — Catalog migration
-- Creates service categories, services, add-ons, packages, and AI matching.
-- Depends on the already-applied baseline migration:
--   public.tenants(status), public.tenant_memberships,
--   public.get_my_tenant_id(), public.current_profile_role(),
--   public.is_platform_admin(), public.set_updated_at(), extensions.vector.
-- ============================================================================

-- The baseline already installs vector in the extensions schema. Keeping this
-- IF NOT EXISTS makes this migration safe if run in another supported setup.
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 1. Service categories
CREATE TABLE IF NOT EXISTS public.service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT service_categories_tenant_slug_key UNIQUE (tenant_id, slug),
    CONSTRAINT service_categories_tenant_id_id_key UNIQUE (tenant_id, id)
);

-- 2. Services
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    category_id UUID,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    buffer_minutes INTEGER NOT NULL DEFAULT 0 CHECK (buffer_minutes >= 0),
    price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    embedding extensions.vector(768),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT services_tenant_slug_key UNIQUE (tenant_id, slug),
    CONSTRAINT services_tenant_id_id_key UNIQUE (tenant_id, id),
    CONSTRAINT services_tenant_category_fkey
        FOREIGN KEY (tenant_id, category_id)
        REFERENCES public.service_categories(tenant_id, id)
        ON DELETE RESTRICT
);

-- 3. Service add-ons
CREATE TABLE IF NOT EXISTS public.service_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
    duration_minutes INTEGER NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT service_addons_tenant_id_id_key UNIQUE (tenant_id, id)
);

-- 4. Service/add-on links. The composite foreign keys prevent cross-tenant links.
CREATE TABLE IF NOT EXISTS public.service_addon_links (
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    service_id UUID NOT NULL,
    addon_id UUID NOT NULL,
    PRIMARY KEY (service_id, addon_id),
    CONSTRAINT service_addon_links_service_fkey
        FOREIGN KEY (tenant_id, service_id)
        REFERENCES public.services(tenant_id, id) ON DELETE CASCADE,
    CONSTRAINT service_addon_links_addon_fkey
        FOREIGN KEY (tenant_id, addon_id)
        REFERENCES public.service_addons(tenant_id, id) ON DELETE CASCADE
);

-- 5. Packages
CREATE TABLE IF NOT EXISTS public.packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT packages_tenant_slug_key UNIQUE (tenant_id, slug),
    CONSTRAINT packages_tenant_id_id_key UNIQUE (tenant_id, id)
);

-- 6. Package items. The requested (package_id, service_id) key is retained.
CREATE TABLE IF NOT EXISTS public.package_items (
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    package_id UUID NOT NULL,
    service_id UUID NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    PRIMARY KEY (package_id, service_id),
    CONSTRAINT package_items_package_fkey
        FOREIGN KEY (tenant_id, package_id)
        REFERENCES public.packages(tenant_id, id) ON DELETE CASCADE,
    CONSTRAINT package_items_service_fkey
        FOREIGN KEY (tenant_id, service_id)
        REFERENCES public.services(tenant_id, id) ON DELETE RESTRICT
);

-- 7. Indexes
CREATE INDEX IF NOT EXISTS service_categories_tenant_id_idx
    ON public.service_categories(tenant_id);
CREATE INDEX IF NOT EXISTS services_tenant_id_idx
    ON public.services(tenant_id);
CREATE INDEX IF NOT EXISTS service_addons_tenant_id_idx
    ON public.service_addons(tenant_id);
CREATE INDEX IF NOT EXISTS service_addon_links_tenant_id_idx
    ON public.service_addon_links(tenant_id);
CREATE INDEX IF NOT EXISTS packages_tenant_id_idx
    ON public.packages(tenant_id);
CREATE INDEX IF NOT EXISTS package_items_tenant_id_idx
    ON public.package_items(tenant_id);
CREATE INDEX IF NOT EXISTS services_tenant_category_active_idx
    ON public.services(tenant_id, category_id, active);
CREATE INDEX IF NOT EXISTS service_addon_links_tenant_service_idx
    ON public.service_addon_links(tenant_id, service_id);
CREATE INDEX IF NOT EXISTS service_addon_links_tenant_addon_idx
    ON public.service_addon_links(tenant_id, addon_id);
CREATE INDEX IF NOT EXISTS package_items_tenant_package_idx
    ON public.package_items(tenant_id, package_id);
CREATE INDEX IF NOT EXISTS package_items_tenant_service_idx
    ON public.package_items(tenant_id, service_id);
CREATE INDEX IF NOT EXISTS services_embedding_idx
    ON public.services USING hnsw (embedding vector_cosine_ops);

-- 8. Updated-at triggers for tables with updated_at columns
DROP TRIGGER IF EXISTS set_service_categories_updated_at ON public.service_categories;
CREATE TRIGGER set_service_categories_updated_at
    BEFORE UPDATE ON public.service_categories
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_services_updated_at ON public.services;
CREATE TRIGGER set_services_updated_at
    BEFORE UPDATE ON public.services
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_service_addons_updated_at ON public.service_addons;
CREATE TRIGGER set_service_addons_updated_at
    BEFORE UPDATE ON public.service_addons
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_packages_updated_at ON public.packages;
CREATE TRIGGER set_packages_updated_at
    BEFORE UPDATE ON public.packages
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 9. RLS on every catalog table
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_addon_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_items ENABLE ROW LEVEL SECURITY;

-- Drop only policies managed by this migration, so reruns are predictable.
DROP POLICY IF EXISTS service_categories_public_read ON public.service_categories;
DROP POLICY IF EXISTS services_public_read ON public.services;
DROP POLICY IF EXISTS service_addons_public_read ON public.service_addons;
DROP POLICY IF EXISTS packages_public_read ON public.packages;
DROP POLICY IF EXISTS service_addon_links_public_read ON public.service_addon_links;
DROP POLICY IF EXISTS package_items_public_read ON public.package_items;
DROP POLICY IF EXISTS service_categories_member_read ON public.service_categories;
DROP POLICY IF EXISTS services_member_read ON public.services;
DROP POLICY IF EXISTS service_addons_member_read ON public.service_addons;
DROP POLICY IF EXISTS service_addon_links_member_read ON public.service_addon_links;
DROP POLICY IF EXISTS packages_member_read ON public.packages;
DROP POLICY IF EXISTS package_items_member_read ON public.package_items;
DROP POLICY IF EXISTS service_categories_owner_admin_write ON public.service_categories;
DROP POLICY IF EXISTS services_owner_admin_write ON public.services;
DROP POLICY IF EXISTS service_addons_owner_admin_write ON public.service_addons;
DROP POLICY IF EXISTS service_addon_links_owner_admin_write ON public.service_addon_links;
DROP POLICY IF EXISTS packages_owner_admin_write ON public.packages;
DROP POLICY IF EXISTS package_items_owner_admin_write ON public.package_items;

-- 10. Public reads: only active catalog entries under active tenants.
CREATE POLICY service_categories_public_read ON public.service_categories
    FOR SELECT TO anon, authenticated
    USING (active AND EXISTS (
        SELECT 1 FROM public.tenants t
        WHERE t.id = service_categories.tenant_id AND t.status = 'active'
    ));

CREATE POLICY services_public_read ON public.services
    FOR SELECT TO anon, authenticated
    USING (active AND EXISTS (
        SELECT 1 FROM public.tenants t
        WHERE t.id = services.tenant_id AND t.status = 'active'
    ));

CREATE POLICY service_addons_public_read ON public.service_addons
    FOR SELECT TO anon, authenticated
    USING (active AND EXISTS (
        SELECT 1 FROM public.tenants t
        WHERE t.id = service_addons.tenant_id AND t.status = 'active'
    ));

CREATE POLICY packages_public_read ON public.packages
    FOR SELECT TO anon, authenticated
    USING (active AND EXISTS (
        SELECT 1 FROM public.tenants t
        WHERE t.id = packages.tenant_id AND t.status = 'active'
    ));

CREATE POLICY service_addon_links_public_read ON public.service_addon_links
    FOR SELECT TO anon, authenticated
    USING (EXISTS (
        SELECT 1
        FROM public.services s
        JOIN public.service_addons a
          ON a.tenant_id = service_addon_links.tenant_id
         AND a.id = service_addon_links.addon_id
        JOIN public.tenants t ON t.id = service_addon_links.tenant_id
        WHERE s.tenant_id = service_addon_links.tenant_id
          AND s.id = service_addon_links.service_id
          AND s.active AND a.active AND t.status = 'active'
    ));

CREATE POLICY package_items_public_read ON public.package_items
    FOR SELECT TO anon, authenticated
    USING (EXISTS (
        SELECT 1
        FROM public.packages p
        JOIN public.services s
          ON s.tenant_id = package_items.tenant_id
         AND s.id = package_items.service_id
        JOIN public.tenants t ON t.id = package_items.tenant_id
        WHERE p.tenant_id = package_items.tenant_id
          AND p.id = package_items.package_id
          AND p.active AND s.active AND t.status = 'active'
    ));

-- 11. Tenant members can read their own tenant's catalog, including drafts.
-- The membership check supports users with different roles across tenants.
CREATE POLICY service_categories_member_read ON public.service_categories
    FOR SELECT TO authenticated
    USING (
        public.is_platform_admin()
        OR tenant_id = public.get_my_tenant_id()
        OR EXISTS (
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.tenant_id = service_categories.tenant_id
              AND tm.profile_id = auth.uid()
        )
    );

CREATE POLICY services_member_read ON public.services
    FOR SELECT TO authenticated
    USING (
        public.is_platform_admin()
        OR tenant_id = public.get_my_tenant_id()
        OR EXISTS (
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.tenant_id = services.tenant_id
              AND tm.profile_id = auth.uid()
        )
    );

CREATE POLICY service_addons_member_read ON public.service_addons
    FOR SELECT TO authenticated
    USING (
        public.is_platform_admin()
        OR tenant_id = public.get_my_tenant_id()
        OR EXISTS (
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.tenant_id = service_addons.tenant_id
              AND tm.profile_id = auth.uid()
        )
    );

CREATE POLICY service_addon_links_member_read ON public.service_addon_links
    FOR SELECT TO authenticated
    USING (
        public.is_platform_admin()
        OR tenant_id = public.get_my_tenant_id()
        OR EXISTS (
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.tenant_id = service_addon_links.tenant_id
              AND tm.profile_id = auth.uid()
        )
    );

CREATE POLICY packages_member_read ON public.packages
    FOR SELECT TO authenticated
    USING (
        public.is_platform_admin()
        OR tenant_id = public.get_my_tenant_id()
        OR EXISTS (
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.tenant_id = packages.tenant_id
              AND tm.profile_id = auth.uid()
        )
    );

CREATE POLICY package_items_member_read ON public.package_items
    FOR SELECT TO authenticated
    USING (
        public.is_platform_admin()
        OR tenant_id = public.get_my_tenant_id()
        OR EXISTS (
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.tenant_id = package_items.tenant_id
              AND tm.profile_id = auth.uid()
        )
    );

-- 12. Tenant owner/admin writes. Use per-tenant membership role, not the
-- profile-wide role, so multi-tenant role differences are respected.
CREATE POLICY service_categories_owner_admin_write ON public.service_categories
    FOR ALL TO authenticated
    USING (
        public.is_platform_admin()
        OR EXISTS (
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.tenant_id = service_categories.tenant_id
              AND tm.profile_id = auth.uid()
              AND tm.role IN ('owner', 'admin')
        )
    )
    WITH CHECK (
        public.is_platform_admin()
        OR EXISTS (
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.tenant_id = service_categories.tenant_id
              AND tm.profile_id = auth.uid()
              AND tm.role IN ('owner', 'admin')
        )
    );

CREATE POLICY services_owner_admin_write ON public.services
    FOR ALL TO authenticated
    USING (
        public.is_platform_admin()
        OR EXISTS (
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.tenant_id = services.tenant_id
              AND tm.profile_id = auth.uid()
              AND tm.role IN ('owner', 'admin')
        )
    )
    WITH CHECK (
        public.is_platform_admin()
        OR EXISTS (
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.tenant_id = services.tenant_id
              AND tm.profile_id = auth.uid()
              AND tm.role IN ('owner', 'admin')
        )
    );

CREATE POLICY service_addons_owner_admin_write ON public.service_addons
    FOR ALL TO authenticated
    USING (
        public.is_platform_admin()
        OR EXISTS (
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.tenant_id = service_addons.tenant_id
              AND tm.profile_id = auth.uid()
              AND tm.role IN ('owner', 'admin')
        )
    )
    WITH CHECK (
        public.is_platform_admin()
        OR EXISTS (
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.tenant_id = service_addons.tenant_id
              AND tm.profile_id = auth.uid()
              AND tm.role IN ('owner', 'admin')
        )
    );

CREATE POLICY service_addon_links_owner_admin_write ON public.service_addon_links
    FOR ALL TO authenticated
    USING (
        public.is_platform_admin()
        OR EXISTS (
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.tenant_id = service_addon_links.tenant_id
              AND tm.profile_id = auth.uid()
              AND tm.role IN ('owner', 'admin')
        )
    )
    WITH CHECK (
        public.is_platform_admin()
        OR EXISTS (
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.tenant_id = service_addon_links.tenant_id
              AND tm.profile_id = auth.uid()
              AND tm.role IN ('owner', 'admin')
        )
    );

CREATE POLICY packages_owner_admin_write ON public.packages
    FOR ALL TO authenticated
    USING (
        public.is_platform_admin()
        OR EXISTS (
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.tenant_id = packages.tenant_id
              AND tm.profile_id = auth.uid()
              AND tm.role IN ('owner', 'admin')
        )
    )
    WITH CHECK (
        public.is_platform_admin()
        OR EXISTS (
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.tenant_id = packages.tenant_id
              AND tm.profile_id = auth.uid()
              AND tm.role IN ('owner', 'admin')
        )
    );

CREATE POLICY package_items_owner_admin_write ON public.package_items
    FOR ALL TO authenticated
    USING (
        public.is_platform_admin()
        OR EXISTS (
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.tenant_id = package_items.tenant_id
              AND tm.profile_id = auth.uid()
              AND tm.role IN ('owner', 'admin')
        )
    )
    WITH CHECK (
        public.is_platform_admin()
        OR EXISTS (
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.tenant_id = package_items.tenant_id
              AND tm.profile_id = auth.uid()
              AND tm.role IN ('owner', 'admin')
        )
    );

-- 13. Table privileges; RLS determines accessible rows.
GRANT SELECT ON
    public.service_categories,
    public.services,
    public.service_addons,
    public.service_addon_links,
    public.packages,
    public.package_items
TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON
    public.service_categories,
    public.services,
    public.service_addons,
    public.service_addon_links,
    public.packages,
    public.package_items
TO authenticated;

-- 14. Tenant-scoped AI service matching. SECURITY INVOKER preserves caller
-- grants and RLS. Results are restricted to active services in active tenants.
CREATE OR REPLACE FUNCTION public.match_services(
    query_embedding extensions.vector(768),
    match_count INTEGER,
    p_tenant_id UUID
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    price_cents INTEGER,
    duration_minutes INTEGER,
    similarity DOUBLE PRECISION
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, extensions, pg_temp
AS $$
    SELECT
        s.id,
        s.name,
        s.description,
        s.price_cents,
        s.duration_minutes,
        (1 - (s.embedding <=> $1))::DOUBLE PRECISION AS similarity
    FROM public.services AS s
    JOIN public.tenants AS t ON t.id = s.tenant_id
    WHERE s.tenant_id = $3
      AND s.active = TRUE
      AND s.embedding IS NOT NULL
      AND t.status = 'active'
    ORDER BY s.embedding <=> $1
    LIMIT GREATEST(COALESCE($2, 5), 0);
$$;

GRANT EXECUTE ON FUNCTION
    public.match_services(extensions.vector, INTEGER, UUID)
TO anon, authenticated;
