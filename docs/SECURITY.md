# Security notes

What protects the app today, and what to remember when adding features.
How the layers fit together (entry, DTO, guard, service, queries, database) is in [ARCHITECTURE](ARCHITECTURE.md).

## Access layers

| Layer | Where | Notes |
| --- | --- | --- |
| Row Level Security | every table in `public` | Always on. Tables only the server uses (`account_applications`, `application_identities`, `application_businesses`, `admin_activity_log`, `subscription_plans`, `password_reset_codes`, `rejected_accounts`) have no client grants, apart from an applicant looking up their own application id. |
| Tenant access checks | `src/lib/merchant/access.ts` (`resolveTenantAccess`) | Server actions must call this instead of trusting a `tenantId` sent by the browser. It only accepts a tenant the signed-in user is an owner/admin/receptionist/staff member of. |
| Walk-in RPC guard | `public.assert_tenant_operator` (migration `rpc_tenant_guard`) | `create_walkin_appointment_safe` and `convert_waitlist_entry_to_appointment` call it first. It lets in the service role, platform admins and operators of that tenant, and rejects everyone else including requests with no session. |
| Payment records | `public.payments` | Clients can only read. `app/actions/payments.ts` checks membership and role, then writes with the server key. |
| Admin decisions | `approve_application`, `reject_application`, `set_account_access` | One transaction each. Only the server can execute them, after the admin guard. |
| Suspended businesses | `block_suspended_tenant_writes` trigger, `lib/merchant/tenant-status.ts` | The database refuses writes from signed-in users. Actions that write with the server key must call `isTenantOpen` first. Billing tables stay open. A new table with `tenant_id` needs the trigger. |
| Appointment balances | `sync_appointment_balance` trigger | Derived from `payments`; clients cannot set them. |
| Public business sites | `lib/storefront/visibility.ts` | Hidden unless the business is active and its website is not unpublished. New public pages must use `isSitePublic`. |
| Admin portal | `src/lib/admin/access.ts`, `requireAdminPortal()` / `assertAdminAction()` | Supabase Auth session plus an active row in `platform_admins`, checked on every request. `is_platform_admin()` reads the same table, so RLS agrees with the app. |
| Rate limiting | `src/lib/rate-limit.ts` | See `docs/ENVIRONMENT.md` for Redis. |

## Rules for new code

- Supabase grants every new table and function to `anon` and `authenticated` by default. `grant update (column)` or `revoke ... from public` does not undo that: **revoke from `anon, authenticated` first**, then grant only what is needed.
- Server-only functions: `revoke all on function ... from public, anon, authenticated`.
- Add a check to `scripts/tests/` for anything clients must not do, and run `npm run test:db` against the local stack.

- **Server actions and API routes always authenticate.** If a route is public on purpose (for example `/api/storefront/[slug]`),
  say so in a comment and return only published data.
- **Never take a tenant id from the client without `resolveTenantAccess`.** RLS is the safety net, not the first check.
- **New tables:** `ENABLE ROW LEVEL SECURITY` and write policies in the same migration.
- **New `SECURITY DEFINER` functions:** set `search_path`, call `assert_tenant_operator(p_tenant_id)` first, and
  `REVOKE ALL ... FROM PUBLIC, anon` (Supabase grants `anon` execute by default, `REVOKE ... FROM PUBLIC` alone is not enough).
- **Public forms** (anything an anonymous visitor can submit) must be rate limited with `limitByClient(...)`.
  The contact forms also carry a hidden `website` honeypot field.
- **Do not log personal data.** The mailer masks recipients (`m***@domain`). Keep it that way.
- **Secrets stay out of git.** Only placeholders in `.env.example`. `supabase/.temp` and `supabase/snippets` are ignored.

## Before going to production

- [ ] Create each admin with `npm run admin:create` and have them store the password in a password manager.
- [ ] Set `REDIS_URL` to a managed Redis.
- [ ] Release migrations and code together: the old code cannot work with the new database. Back up first, check `supabase db push --dry-run` (add `--include-all` if it reports older unapplied migrations), push, then deploy. `seed.sql` is not applied.
- [ ] Change or delete any hosted account created by the old test script under `supabase/snippets/`. Its password is in git history.
- [ ] Rotate any credential that was ever committed (the old Gmail app password is still in git history).
- [ ] Run `npm audit --omit=dev` (currently clean) and keep `next`, `zod` and `nodemailer` up to date.
- [ ] Confirm which Supabase keys the hosting environment uses. The service-role key must be server-side only.

## Known gaps

The full, tracked list is in [KNOWN-ISSUES](KNOWN-ISSUES.md) (section 3). Highlights:

- The in-memory fallback limiter is per process. Redis fixes that.
- Admin accounts have no password reset screen or MFA yet. The "Forgot password?" screen on `/admin/login` is only the design,
  it does not send anything. The MFA and "unauthorized role" cards from the Figma are not wired up.
- Dev-only `npm audit` findings remain in `typescript-eslint` (moderate, not shipped).
