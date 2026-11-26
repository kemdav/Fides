# Security notes

What protects the app today, and what to remember when adding features.
How the layers fit together (entry, DTO, guard, service, queries, database) is in [ARCHITECTURE](ARCHITECTURE.md).

## Access layers

| Layer | Where | Notes |
| --- | --- | --- |
| Row Level Security | every table in `public` | Always on. Tables with no policy (`admin_activity_log`, `password_reset_codes`, `rejected_accounts`) are reachable only with the service role. |
| Tenant access checks | `src/lib/merchant/access.ts` (`resolveTenantAccess`) | Server actions must call this instead of trusting a `tenantId` sent by the browser. It only accepts a tenant the signed-in user is an owner/admin/receptionist/staff member of. |
| Walk-in RPC guard | `public.assert_tenant_operator` (migration `rpc_tenant_guard`) | `create_walkin_appointment_safe` and `convert_waitlist_entry_to_appointment` call it first. It lets in the service role, platform admins and operators of that tenant, and rejects everyone else including requests with no session. |
| Admin portal | `src/lib/admin/*`, `requireAdminPortal()` | Local accounts from `ADMIN_ACCOUNTS`, scrypt hashed, signed HttpOnly session cookie (8 hours). |
| Rate limiting | `src/lib/rate-limit.ts` | See `docs/ENVIRONMENT.md` for Redis. |

## Rules for new code

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

- [ ] Set `ADMIN_SESSION_SECRET` (32+ random characters) and `ADMIN_ACCOUNTS` with unique 12+ character passwords.
- [ ] Set `REDIS_URL` to a managed Redis.
- [ ] Apply all migrations (through `20261123094809_rpc_tenant_guard.sql`) to the hosted database.
- [ ] Rotate any credential that was ever committed (the old Gmail app password is still in git history).
- [ ] Run `npm audit --omit=dev` (currently clean) and keep `next`, `zod` and `nodemailer` up to date.
- [ ] Confirm which Supabase keys the hosting environment uses. The service-role key must be server-side only.

## Known gaps

The full, tracked list is in [KNOWN-ISSUES](KNOWN-ISSUES.md) (section 3). Highlights:

- The in-memory fallback limiter is per process. Redis fixes that.
- Admin accounts have no password reset or MFA yet. The "Forgot password?" screen on `/admin/login` is only the design,
  it does not send anything. The MFA and "unauthorized role" cards from the Figma are not wired up.
- Dev-only `npm audit` findings remain in `typescript-eslint` (moderate, not shipped).
