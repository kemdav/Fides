-- ============================================================
-- Fides: payment records are written by the server only
--
-- Any receptionist or staff member could write public.payments with the public
-- key: change amounts, or turn a voided or refunded payment back into a normal
-- one. The payments actions check the role first and then write, so clients only
-- need to read.
-- ============================================================

begin;

drop policy if exists payments_operational_insert on public.payments;
drop policy if exists payments_operational_update on public.payments;

revoke insert, update, delete, truncate on public.payments from anon, authenticated;

commit;
