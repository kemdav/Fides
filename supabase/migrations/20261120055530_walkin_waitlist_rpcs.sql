-- 00020_walkin_waitlist_rpcs.sql
-- Overlap-safe walk-in appointment creation and atomic waitlist conversion RPCs (CPG-100 / CPG-168)

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_staff_active_window
  ON public.appointments (tenant_id, staff_id, starts_at, ends_at)
  WHERE status IN ('pending_approval', 'confirmed', 'checked_in', 'in_service');

-- ---------------------------------------------------------------------------
-- 1. create_walkin_appointment_safe
--    Prevents double-booking a staff member across active appointment statuses
--    using a transaction-scoped advisory lock, then inserts the appointment
--    and its appointment_services row atomically.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_walkin_appointment_safe(
  p_tenant_id        UUID,
  p_customer_id      UUID,
  p_staff_id         UUID,
  p_service_id       UUID,
  p_starts_at        TIMESTAMPTZ,
  p_ends_at          TIMESTAMPTZ,
  p_total_cents      INTEGER DEFAULT 0,
  p_duration_minutes INTEGER DEFAULT 60,
  p_notes            TEXT DEFAULT NULL,
  p_timezone         TEXT DEFAULT 'Asia/Manila'
)
RETURNS TABLE (
  appointment_id UUID,
  starts_at      TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_caller_id      UUID := auth.uid();
  v_created_by     UUID;
  v_appointment_id UUID;
BEGIN
  IF p_ends_at <= p_starts_at THEN
    RAISE EXCEPTION 'INVALID_TIME_RANGE: ends_at must be after starts_at';
  END IF;

  -- Tenant authorization guard for authenticated callers
  IF v_caller_id IS NOT NULL AND NOT public.is_platform_admin() THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.tenant_memberships tm
      WHERE tm.tenant_id = p_tenant_id
        AND tm.profile_id = v_caller_id
        AND tm.role IN ('owner', 'admin', 'receptionist', 'staff')
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.profiles pr
      WHERE pr.id = v_caller_id
        AND pr.tenant_id = p_tenant_id
    ) THEN
      RAISE EXCEPTION 'UNAUTHORIZED: caller does not belong to this tenant';
    END IF;
  END IF;

  -- Serialize concurrent bookings for the same tenant + staff member
  PERFORM pg_advisory_xact_lock(
    hashtext(p_tenant_id::TEXT || ':' || p_staff_id::TEXT)
  );

  -- Strict overlap check against active bookings
  IF EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.tenant_id = p_tenant_id
      AND a.staff_id = p_staff_id
      AND a.status IN ('pending_approval', 'confirmed', 'checked_in', 'in_service')
      AND a.starts_at < p_ends_at
      AND a.ends_at > p_starts_at
  ) THEN
    RAISE EXCEPTION 'SLOT_UNAVAILABLE: staff member already has an overlapping booking';
  END IF;

  -- Populate created_by only if caller has a valid profile row
  SELECT pr.id INTO v_created_by
  FROM public.profiles pr
  WHERE pr.id = v_caller_id
  LIMIT 1;

  INSERT INTO public.appointments (
    tenant_id,
    customer_id,
    staff_id,
    starts_at,
    ends_at,
    status,
    source,
    total_cents,
    notes,
    timezone,
    created_by
  )
  VALUES (
    p_tenant_id,
    p_customer_id,
    p_staff_id,
    p_starts_at,
    p_ends_at,
    'confirmed'::public.appointment_status,
    'walk_in'::public.booking_source,
    COALESCE(p_total_cents, 0),
    p_notes,
    COALESCE(NULLIF(p_timezone, ''), 'Asia/Manila'),
    v_created_by
  )
  RETURNING id INTO v_appointment_id;

  IF p_service_id IS NOT NULL THEN
    INSERT INTO public.appointment_services (
      tenant_id,
      appointment_id,
      service_id,
      staff_id,
      duration_minutes,
      price_cents
    )
    VALUES (
      p_tenant_id,
      v_appointment_id,
      p_service_id,
      p_staff_id,
      GREATEST(COALESCE(p_duration_minutes, 60), 15),
      COALESCE(p_total_cents, 0)
    );
  END IF;

  RETURN QUERY
  SELECT v_appointment_id AS appointment_id, p_starts_at AS starts_at;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. convert_waitlist_entry_to_appointment
--    Locks the waitlist row, checks staff slot availability, creates the
--    confirmed walk-in appointment + service link, and marks the waitlist
--    entry as converted in a single atomic transaction.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.convert_waitlist_entry_to_appointment(
  p_tenant_id         UUID,
  p_waitlist_entry_id UUID,
  p_staff_id          UUID,
  p_starts_at         TIMESTAMPTZ,
  p_ends_at           TIMESTAMPTZ,
  p_notes             TEXT DEFAULT NULL,
  p_mark_notified     BOOLEAN DEFAULT TRUE,
  p_timezone          TEXT DEFAULT 'Asia/Manila'
)
RETURNS TABLE (
  appointment_id    UUID,
  waitlist_entry_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_caller_id        UUID := auth.uid();
  v_created_by       UUID;
  v_entry            public.waitlist_entries%ROWTYPE;
  v_price_cents      INTEGER := 0;
  v_duration_minutes INTEGER;
  v_appointment_id   UUID;
BEGIN
  IF p_ends_at <= p_starts_at THEN
    RAISE EXCEPTION 'INVALID_TIME_RANGE: ends_at must be after starts_at';
  END IF;

  -- Tenant authorization guard for authenticated callers
  IF v_caller_id IS NOT NULL AND NOT public.is_platform_admin() THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.tenant_memberships tm
      WHERE tm.tenant_id = p_tenant_id
        AND tm.profile_id = v_caller_id
        AND tm.role IN ('owner', 'admin', 'receptionist', 'staff')
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.profiles pr
      WHERE pr.id = v_caller_id
        AND pr.tenant_id = p_tenant_id
    ) THEN
      RAISE EXCEPTION 'UNAUTHORIZED: caller does not belong to this tenant';
    END IF;
  END IF;

  -- Lock the waiting list row so it cannot be converted twice concurrently
  SELECT * INTO v_entry
  FROM public.waitlist_entries w
  WHERE w.id = p_waitlist_entry_id
    AND w.tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND
     OR v_entry.status NOT IN ('waiting', 'notified')
     OR v_entry.converted_appointment_id IS NOT NULL THEN
    RAISE EXCEPTION 'WAITLIST_NOT_CONVERTIBLE: waiting list entry is not active';
  END IF;

  -- Serialize concurrent bookings for the same tenant + staff member
  PERFORM pg_advisory_xact_lock(
    hashtext(p_tenant_id::TEXT || ':' || p_staff_id::TEXT)
  );

  -- Strict overlap check against active bookings
  IF EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.tenant_id = p_tenant_id
      AND a.staff_id = p_staff_id
      AND a.status IN ('pending_approval', 'confirmed', 'checked_in', 'in_service')
      AND a.starts_at < p_ends_at
      AND a.ends_at > p_starts_at
  ) THEN
    RAISE EXCEPTION 'SLOT_UNAVAILABLE: staff member already has an overlapping booking';
  END IF;

  -- Resolve service pricing & duration if a service was attached
  v_duration_minutes := GREATEST(
    15,
    FLOOR(EXTRACT(EPOCH FROM (p_ends_at - p_starts_at)) / 60)::INTEGER
  );

  IF v_entry.service_id IS NOT NULL THEN
    SELECT
      COALESCE(s.price_cents, 0),
      COALESCE(s.duration_minutes, v_duration_minutes)
    INTO v_price_cents, v_duration_minutes
    FROM public.services s
    WHERE s.tenant_id = p_tenant_id
      AND s.id = v_entry.service_id
    LIMIT 1;
  END IF;

  SELECT pr.id INTO v_created_by
  FROM public.profiles pr
  WHERE pr.id = v_caller_id
  LIMIT 1;

  INSERT INTO public.appointments (
    tenant_id,
    customer_id,
    staff_id,
    starts_at,
    ends_at,
    status,
    source,
    total_cents,
    notes,
    timezone,
    waitlist_entry_id,
    created_by
  )
  VALUES (
    p_tenant_id,
    v_entry.customer_id,
    p_staff_id,
    p_starts_at,
    p_ends_at,
    'confirmed'::public.appointment_status,
    'walk_in'::public.booking_source,
    COALESCE(v_price_cents, 0),
    COALESCE(p_notes, v_entry.notes),
    COALESCE(NULLIF(p_timezone, ''), 'Asia/Manila'),
    v_entry.id,
    v_created_by
  )
  RETURNING id INTO v_appointment_id;

  IF v_entry.service_id IS NOT NULL THEN
    INSERT INTO public.appointment_services (
      tenant_id,
      appointment_id,
      service_id,
      staff_id,
      duration_minutes,
      price_cents
    )
    VALUES (
      p_tenant_id,
      v_appointment_id,
      v_entry.service_id,
      p_staff_id,
      GREATEST(COALESCE(v_duration_minutes, 60), 15),
      COALESCE(v_price_cents, 0)
    );
  END IF;

  UPDATE public.waitlist_entries
  SET
    status                   = 'converted'::public.waitlist_status,
    staff_id                 = p_staff_id,
    converted_appointment_id = v_appointment_id,
    notified_at              = CASE
                                 WHEN p_mark_notified THEN COALESCE(notified_at, NOW())
                                 ELSE notified_at
                               END,
    notes                    = COALESCE(p_notes, notes),
    updated_at               = NOW()
  WHERE id = v_entry.id
    AND tenant_id = p_tenant_id;

  RETURN QUERY
  SELECT v_appointment_id AS appointment_id, v_entry.id AS waitlist_entry_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Permissions & PostgREST schema reload
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.create_walkin_appointment_safe(
  UUID, UUID, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER, TEXT, TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_walkin_appointment_safe(
  UUID, UUID, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER, TEXT, TEXT
) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.convert_waitlist_entry_to_appointment(
  UUID, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, BOOLEAN, TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.convert_waitlist_entry_to_appointment(
  UUID, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, BOOLEAN, TEXT
) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';