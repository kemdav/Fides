-- Service staff have read-only access to appointments assigned to them.
CREATE FUNCTION public.is_assigned_service_staff(p_tenant_id uuid, p_appointment_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_memberships membership
    JOIN public.staff_members staff
      ON staff.tenant_id = membership.tenant_id AND staff.profile_id = membership.profile_id
    JOIN public.appointments appointment ON appointment.tenant_id = staff.tenant_id
    WHERE membership.tenant_id = p_tenant_id AND membership.profile_id = auth.uid()
      AND membership.role = 'staff' AND staff.active AND appointment.id = p_appointment_id
      AND (appointment.staff_id = staff.id OR EXISTS (
        SELECT 1 FROM public.appointment_services line
        WHERE line.tenant_id = p_tenant_id AND line.appointment_id = p_appointment_id AND line.staff_id = staff.id
      ))
  );
$$;
REVOKE ALL ON FUNCTION public.is_assigned_service_staff(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_assigned_service_staff(uuid, uuid) TO authenticated;

CREATE POLICY appointments_assigned_service_staff_read ON public.appointments
FOR SELECT TO authenticated USING (public.is_assigned_service_staff(tenant_id, id));

CREATE POLICY appointment_services_assigned_service_staff_read ON public.appointment_services
FOR SELECT TO authenticated USING (
  public.is_assigned_service_staff(tenant_id, appointment_id)
  AND EXISTS (
    SELECT 1 FROM public.staff_members staff
    WHERE staff.tenant_id = appointment_services.tenant_id AND staff.id = appointment_services.staff_id
      AND staff.profile_id = auth.uid() AND staff.active
  )
);

DROP POLICY appointments_operational_access ON public.appointments;
CREATE POLICY appointments_operational_access
ON public.appointments
FOR ALL TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = appointments.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin', 'receptionist')
    )
)
WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = appointments.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin', 'receptionist')
    )
);

DROP POLICY appointment_services_operational_access ON public.appointment_services;
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
          AND tm.role IN ('owner', 'admin', 'receptionist')
    )
)
WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = appointment_services.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin', 'receptionist')
    )
);

DROP POLICY appointment_status_history_parent_read ON public.appointment_status_history;
CREATE POLICY appointment_status_history_parent_read
ON public.appointment_status_history
FOR SELECT TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = appointment_status_history.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin', 'receptionist')
    )
);

DROP POLICY qr_passes_parent_access ON public.qr_passes;
CREATE POLICY qr_passes_parent_access
ON public.qr_passes
FOR ALL TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = qr_passes.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin', 'receptionist')
    )
)
WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = qr_passes.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin', 'receptionist')
    )
);

DROP POLICY customers_operational_manage ON public.customers;
CREATE POLICY customers_operational_manage ON public.customers
FOR ALL TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = customers.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin', 'receptionist')
    )
)
WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = customers.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin', 'receptionist')
    )
);

DROP POLICY customer_notes_operational_manage ON public.customer_notes;
CREATE POLICY customer_notes_operational_manage ON public.customer_notes
FOR ALL TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = customer_notes.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin', 'receptionist')
    )
)
WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        WHERE tm.tenant_id = customer_notes.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin', 'receptionist')
    )
);

DROP POLICY payments_operational_select ON public.payments;
CREATE POLICY payments_operational_select
ON public.payments
FOR SELECT
TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1
        FROM public.tenant_memberships tm
        WHERE tm.tenant_id = payments.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin', 'receptionist')
    )
);

DROP POLICY payments_operational_insert ON public.payments;
CREATE POLICY payments_operational_insert
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1
        FROM public.tenant_memberships tm
        WHERE tm.tenant_id = payments.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin', 'receptionist')
    )
);

DROP POLICY payments_operational_update ON public.payments;
CREATE POLICY payments_operational_update
ON public.payments
FOR UPDATE
TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1
        FROM public.tenant_memberships tm
        WHERE tm.tenant_id = payments.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin', 'receptionist')
    )
)
WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1
        FROM public.tenant_memberships tm
        WHERE tm.tenant_id = payments.tenant_id
          AND tm.profile_id = auth.uid()
          AND (
              tm.role IN ('owner', 'admin')
              OR (
                  tm.role IN ('receptionist')
                  AND payments.status NOT IN ('refunded', 'voided')
              )
          )
    )
);
