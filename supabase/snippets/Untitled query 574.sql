NOTIFY pgrst, 'reload schema';

SELECT
  p.proname,
  pg_get_function_identity_arguments(p.oid) AS args,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_can_exec,
  has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_can_exec
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'create_walkin_appointment_safe';