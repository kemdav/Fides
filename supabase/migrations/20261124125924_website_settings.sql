-- ============================================================================
-- Fides — Website Settings Extensions (Social Share Image & Staff Read RBAC)
-- Migration: 00027_website_settings.sql
-- ============================================================================

BEGIN;

-- 1. Add dedicated social preview image columns for Tab 4 (Search & sharing)
ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS social_image_url TEXT,
  ADD COLUMN IF NOT EXISTS social_image_name TEXT;

-- 2. Allow authenticated tenant members (owners + staff) to read their tenant's
--    website settings (including working draft state for read-only staff preview).
--    INSERT / UPDATE remain strictly owner-only per 00013_website_settings.sql.
DROP POLICY IF EXISTS tenant_settings_select_member ON public.tenant_settings;
CREATE POLICY tenant_settings_select_member
  ON public.tenant_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tenant_memberships tm
      WHERE tm.tenant_id = tenant_settings.tenant_id
        AND tm.profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.tenant_id = tenant_settings.tenant_id
        AND p.id = auth.uid()
    )
  );

COMMIT;