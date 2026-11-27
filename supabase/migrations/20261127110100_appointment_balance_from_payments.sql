-- ============================================================
-- Fides: appointment balances come from payment records
--
-- appointments.paid_cents and payment_status were written separately by the app
-- after each payment, and any operator could set them to anything.
-- The database now derives them, in the same transaction as the payment.
-- ============================================================

begin;

create or replace function public.sync_appointment_balance()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_appointment_id uuid;
begin
  for v_appointment_id in
    select distinct x
    from unnest(array[
      case when tg_op <> 'DELETE' then new.appointment_id end,
      case when tg_op <> 'INSERT' then old.appointment_id end
    ]) as x
    where x is not null
    order by x
  loop
    -- lock first, so two payments at once add up instead of overwriting each other
    perform 1 from public.appointments where id = v_appointment_id for update;

    update public.appointments a
       set paid_cents = p.paid,
           payment_status = case when p.paid <= 0 then 'unpaid' when p.paid >= a.total_cents then 'paid' else 'partial' end
      from (
        select coalesce(sum(amount_cents), 0)::integer as paid
        from public.payments
        where appointment_id = v_appointment_id and status in ('paid', 'pending')
      ) p
     where a.id = v_appointment_id;
  end loop;
  return null;
end;
$$;

revoke all on function public.sync_appointment_balance() from public, anon, authenticated;

drop trigger if exists sync_appointment_balance on public.payments;
create trigger sync_appointment_balance
  after insert or delete or update of appointment_id, amount_cents, status on public.payments
  for each row execute function public.sync_appointment_balance();

-- clients cannot set the balance themselves, and a price change recalculates the status
create or replace function public.protect_appointment_balance()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    if (tg_op = 'INSERT' and (new.paid_cents <> 0 or new.payment_status <> 'unpaid'))
       or (tg_op = 'UPDATE' and (new.paid_cents is distinct from old.paid_cents or new.payment_status is distinct from old.payment_status)) then
      raise exception 'Payment totals are set from recorded payments.' using errcode = '42501';
    end if;
  end if;

  if tg_op = 'UPDATE' and new.total_cents is distinct from old.total_cents then
    new.payment_status := case
      when new.paid_cents <= 0 then 'unpaid'
      when new.paid_cents >= new.total_cents then 'paid'
      else 'partial'
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_appointment_balance on public.appointments;
create trigger protect_appointment_balance
  before insert or update on public.appointments
  for each row execute function public.protect_appointment_balance();

-- correct anything already stored
with balances as (
  select a.id, coalesce(sum(p.amount_cents) filter (where p.status in ('paid', 'pending')), 0)::integer as paid
  from public.appointments a
  left join public.payments p on p.appointment_id = a.id
  group by a.id
)
update public.appointments a
   set paid_cents = b.paid,
       payment_status = case when b.paid <= 0 then 'unpaid' when b.paid >= a.total_cents then 'paid' else 'partial' end
  from balances b
 where a.id = b.id
   and (a.paid_cents <> b.paid
        or a.payment_status <> case when b.paid <= 0 then 'unpaid' when b.paid >= a.total_cents then 'paid' else 'partial' end);

commit;
