-- 00024_rpc_tenant_guard
-- The walk-in RPCs skipped their tenant check whenever auth.uid() was null. They now call one shared guard that
-- only lets through: the service role / database admin, platform admins, and active operators of the tenant.
-- Anyone else (including a missing session) is rejected.

CREATE OR REPLACE FUNCTION public.assert_tenant_operator(p_tenant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $guard$
DECLARE
  v_caller UUID := auth.uid();
BEGIN
  -- trusted server-side callers
  IF coalesce(auth.role(), '') = 'service_role' OR session_user IN ('postgres', 'supabase_admin') THEN
    RETURN;
  END IF;

  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: sign in required';
  END IF;

  IF public.is_platform_admin() THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.tenant_memberships tm
    WHERE tm.tenant_id = p_tenant_id
      AND tm.profile_id = v_caller
      AND tm.role IN ('owner', 'admin', 'receptionist', 'staff')
  ) OR EXISTS (
    SELECT 1
    FROM public.profiles pr
    WHERE pr.id = v_caller
      AND pr.tenant_id = p_tenant_id
      AND pr.role IN ('owner', 'admin', 'receptionist', 'staff')
  ) THEN
    RETURN;
  END IF;

  RAISE EXCEPTION 'UNAUTHORIZED: caller does not belong to this tenant';
END;
$guard$;

REVOKE ALL ON FUNCTION public.assert_tenant_operator(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_walkin_appointment_safe(p_tenant_id uuid, p_customer_id uuid, p_staff_id uuid, p_service_id uuid, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone, p_total_cents integer DEFAULT 0, p_duration_minutes integer DEFAULT 60, p_notes text DEFAULT NULL::text, p_timezone text DEFAULT 'Asia/Manila'::text)
 RETURNS TABLE(appointment_id uuid, starts_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_caller_id      UUID := auth.uid();
  v_created_by     UUID;
  v_appointment_id UUID;
BEGIN
  IF p_ends_at <= p_starts_at THEN
    RAISE EXCEPTION 'INVALID_TIME_RANGE: ends_at must be after starts_at';
  END IF;

  -- Tenant authorization: signed-in operators of this tenant, platform admins, or the service role
  PERFORM public.assert_tenant_operator(p_tenant_id);

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
$function$;

CREATE OR REPLACE FUNCTION public.convert_waitlist_entry_to_appointment(p_tenant_id uuid, p_waitlist_entry_id uuid, p_staff_id uuid, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone, p_notes text DEFAULT NULL::text, p_mark_notified boolean DEFAULT true, p_timezone text DEFAULT 'Asia/Manila'::text)
 RETURNS TABLE(appointment_id uuid, waitlist_entry_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Tenant authorization: signed-in operators of this tenant, platform admins, or the service role
  PERFORM public.assert_tenant_operator(p_tenant_id);

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
$function$;

REVOKE ALL ON FUNCTION public.create_walkin_appointment_safe(
  UUID, UUID, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER, TEXT, TEXT
) FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.convert_waitlist_entry_to_appointment(
  UUID, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, BOOLEAN, TEXT
) FROM PUBLIC, anon;

NOTIFY pgrst, 'reload schema';
