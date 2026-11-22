drop function if exists public.claim_staff_email_change(uuid, text, text);

-- Keep exhausted requests unavailable after removing the PIN attempt counter.
update public.staff_email_change_requests set expires_at = least(expires_at, now())
where attempts >= 5;

alter table public.staff_email_change_requests
  drop column pin_hash,
  drop column attempts;
