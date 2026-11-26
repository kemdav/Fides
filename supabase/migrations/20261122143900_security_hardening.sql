-- 00023_security_hardening
-- 1) The walk-in RPCs only check tenant membership when auth.uid() is set, and Supabase grants EXECUTE to
--    anon by default, so anonymous callers could skip the check. Only signed-in users and the service role may call them.
REVOKE ALL ON FUNCTION public.create_walkin_appointment_safe(
  UUID, UUID, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER, TEXT, TEXT
) FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.convert_waitlist_entry_to_appointment(
  UUID, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, BOOLEAN, TEXT
) FROM PUBLIC, anon;

-- 2) handle_new_user is a trigger function and must not be callable through the API.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 3) Public inquiries: only for an active business (or the platform itself) and with sane field sizes.
DROP POLICY IF EXISTS inquiries_insert_public ON public.inquiries;
CREATE POLICY inquiries_insert_public
    ON public.inquiries
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        char_length(name) BETWEEN 1 AND 120
        AND char_length(email) BETWEEN 3 AND 200
        AND char_length(topic) BETWEEN 1 AND 100
        AND char_length(message) BETWEEN 1 AND 2000
        AND (phone IS NULL OR char_length(phone) <= 40)
        AND (
            tenant_id IS NULL
            OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = inquiries.tenant_id AND t.status = 'active')
        )
    );

NOTIFY pgrst, 'reload schema';
