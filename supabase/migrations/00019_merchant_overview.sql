-- Merchant overview aggregates and dashboard query indexes.

CREATE INDEX IF NOT EXISTS payments_tenant_status_paid_at_idx
    ON public.payments (tenant_id, status, paid_at);

CREATE INDEX IF NOT EXISTS appointments_tenant_customer_status_starts_at_idx
    ON public.appointments (tenant_id, customer_id, status, starts_at);

CREATE OR REPLACE FUNCTION public.get_merchant_overview_metrics(
    p_tenant_id UUID,
    p_current_start TIMESTAMPTZ,
    p_current_end TIMESTAMPTZ,
    p_previous_start TIMESTAMPTZ,
    p_previous_end TIMESTAMPTZ
)
RETURNS TABLE (
    revenue_cents BIGINT,
    revenue_change_percent NUMERIC,
    booking_count BIGINT,
    active_customer_count BIGINT,
    customer_growth_percent NUMERIC,
    average_order_value_cents BIGINT
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
WITH current_payments AS (
    SELECT amount_cents
    FROM public.payments
    WHERE tenant_id = p_tenant_id
      AND status = 'paid'
      AND paid_at >= p_current_start
      AND paid_at < p_current_end
),
previous_payments AS (
    SELECT amount_cents
    FROM public.payments
    WHERE tenant_id = p_tenant_id
      AND status = 'paid'
      AND paid_at >= p_previous_start
      AND paid_at < p_previous_end
),
current_bookings AS (
    SELECT COUNT(*) AS booking_count,
           COUNT(DISTINCT customer_id) FILTER (WHERE customer_id IS NOT NULL) AS active_customer_count
    FROM public.appointments
    WHERE tenant_id = p_tenant_id
      AND starts_at >= p_current_start
      AND starts_at < p_current_end
      AND status NOT IN ('cancelled', 'rejected', 'expired', 'no_show')
),
previous_bookings AS (
    SELECT COUNT(DISTINCT customer_id) FILTER (WHERE customer_id IS NOT NULL) AS active_customer_count
    FROM public.appointments
    WHERE tenant_id = p_tenant_id
      AND starts_at >= p_previous_start
      AND starts_at < p_previous_end
      AND status NOT IN ('cancelled', 'rejected', 'expired', 'no_show')
),
totals AS (
    SELECT
      COALESCE((SELECT SUM(amount_cents) FROM current_payments), 0)::BIGINT AS current_revenue,
      COALESCE((SELECT SUM(amount_cents) FROM previous_payments), 0)::BIGINT AS previous_revenue,
      COALESCE((SELECT AVG(amount_cents) FROM current_payments), 0)::BIGINT AS average_order_value
)
SELECT
    current_revenue AS revenue_cents,
    CASE WHEN previous_revenue = 0
         THEN CASE WHEN current_revenue = 0 THEN 0 ELSE 100 END
         ELSE ROUND(((current_revenue - previous_revenue)::NUMERIC / previous_revenue) * 100, 2)
    END AS revenue_change_percent,
    current_bookings.booking_count,
    current_bookings.active_customer_count,
    CASE WHEN previous_bookings.active_customer_count = 0
         THEN CASE WHEN current_bookings.active_customer_count = 0 THEN 0 ELSE 100 END
         ELSE ROUND(((current_bookings.active_customer_count - previous_bookings.active_customer_count)::NUMERIC
           / previous_bookings.active_customer_count) * 100, 2)
    END AS customer_growth_percent,
    average_order_value AS average_order_value_cents
FROM totals, current_bookings, previous_bookings;
$$;

GRANT EXECUTE ON FUNCTION public.get_merchant_overview_metrics(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ)
TO authenticated;

NOTIFY pgrst, 'reload schema';
