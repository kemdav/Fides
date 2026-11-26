# Fides

Multi-tenant SaaS platform giving local service businesses an official, branded
booking website and a unified management dashboard. Online bookings, phone
requests, and walk-in visits flow through a single scheduling engine, with
tenant isolation enforced at the database layer.

> **Docs for the team:** [architecture guide](docs/ARCHITECTURE.md) (start here) ·
> [known issues and backlog](docs/KNOWN-ISSUES.md) · [environment variables](docs/ENVIRONMENT.md) ·
> [security notes](docs/SECURITY.md) · [frontend reuse guide](docs/FRONTEND.md)

## Tech stack

| Concern        | Choice                                                        |
| -------------- | ------------------------------------------------------------- |
| Framework      | Next.js 16 (App Router) + React 19 + TypeScript (strict)      |
| Styling        | Tailwind CSS v4 (structural baseline only)                    |
| Database       | Supabase PostgreSQL (RLS, pgvector)                           |
| Auth           | Supabase Auth (JWT, cookie-based SSR sessions)                |
| Realtime/Files | Supabase Realtime + Storage                                   |
| AI             | Google Gemini API (`@google/genai`, 3.0s timeout ceiling)     |
| Email          | SMTP via nodemailer (transactional mailer)                    |
| Rate limiting  | Redis (ioredis), in-memory fallback when `REDIS_URL` is unset |
| Delivery       | Progressive Web App (manifest + service worker)               |

## Getting started

Requires Node 20+, Docker (Supabase and Redis run in containers) and the Supabase CLI.

```bash
npm install
cp .env.example .env.local        # then fill in real values (see docs/ENVIRONMENT.md)

docker compose up -d redis        # local Redis for rate limiting (host port 6380)
supabase start                    # local Supabase stack
supabase db reset                 # apply all migrations + seed data
                                  # extra or hosted admins: npm run admin:create -- --email you@example.com --name "Your Name"

npm run dev
```

Admin accounts (no environment variables):

1. `supabase db reset` seeds `admin@fides.app` for local use (password in `supabase/seed.sql`).
2. On a hosted project, create admins with `npm run admin:create` (see `docs/ENVIRONMENT.md`).

Admins sign in at `/admin/login`. The normal `/login` is for business owners only and never accepts admin accounts.

The app still boots with missing values (integrations report misconfiguration at request time), but admin login
needs a platform admin account and every protected rate-limited form works best with Redis running.

## Scripts

| Script              | Purpose                        |
| ------------------- | ------------------------------ |
| `npm run dev`       | Start the dev server           |
| `npm run build`     | Production build               |
| `npm run start`     | Serve the production build     |
| `npm run lint`      | ESLint                         |
| `npm run typecheck` | `next typegen && tsc --noEmit` |
| `npm test`          | Unit tests (`src/lib/__tests__`) |
| `npm run test:db` | Database access checks against the local Supabase stack |
| `npm run email:test` / `email:check` | Send a test email / verify mail setup |
| `npm run admin:create -- --email <email> --name "<name>"` | Create a platform admin (`--disable` turns one off) |

## Project structure

```
src/
  app/                     Next.js App Router
    (site)/                Provider website surface (per-tenant)
    (dashboard)/           Management dashboard surface
    (admin)/admin/         Fides admin portal pages (needs an admin session)
    admin/login/           Admin sign-in (outside the (admin) group on purpose)
    login/, register/      Business owner sign-in and registration
    contact/               Global contact page
    auth/callback/         Supabase auth code exchange
    api/health/            Liveness probe
  components/
    ui/                    Shared primitives: buttonClasses, inputClasses, PasswordInput, Modal, Card
    auth/                  Reusable auth screens (AuthCard, AuthField, AuthSubmit, admin shell)
    landing/               Landing page, headers and the shared full-page MobileMenu
    layout/                Layout wrappers
    pwa/                   Service worker registration
  lib/
    supabase/              Browser / server / admin clients + session middleware
    tenant/                Wildcard subdomain -> tenant resolution
    ai/                    Gemini concierge wrapper
    mail/                  SMTP transactional mailer
    admin/                 Platform admin guard and identity (Supabase Auth + `platform_admins`)
    merchant/access.ts     resolveTenantAccess: checks a user may act on a tenant
    rate-limit.ts          Redis-backed rate limiter (in-memory fallback)
    env.ts                 Validated environment access
  types/
    database.types.ts      Supabase schema types
  proxy.ts                 Next.js 16 proxy (session refresh + tenant routing)
supabase/
  migrations/              SQL migrations, named <utc timestamp>_<name>.sql
  seed.sql                 Local seed data (Bella Vita demo tenant, owner@bellavita.com / Password123!)
public/                    PWA manifest, service worker, offline shell, icons
```

## Architecture notes

The full guide is [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): why we run one Next.js app on Supabase instead of a separate
Node backend, the entry / DTO / service / queries layering we are moving to (feature modules in `src/features`), the
rules every change follows, an honest snapshot of where the code is today, the migration plan and the production checklist.
Short version:

- **Multi-tenant routing.** One Next.js app serves every provider website, the
  dashboard, and the admin portal. `src/proxy.ts` (Next.js 16's replacement for
  `middleware.ts`) resolves the tenant from the request hostname using the
  wildcard subdomain strategy and forwards it via the `x-fides-tenant` header.
- **Tenant isolation.** `supabase/migrations/*_baseline.sql` enables
  PostgreSQL Row Level Security on `tenants`, `profiles`, and
  `tenant_memberships`, with policies driven by tenant claims in the JWT.
- **Sessions.** Supabase sessions are cookie-based; the proxy refreshes tokens
  on every request so server-rendered requests always see a valid session.
- **External calls.** The Gemini wrapper enforces the 3.0-second concierge
  timeout required by the SRS/SPMP. The mailer falls back to a console transport
  when SMTP credentials are absent.

## Design system

Visual styling is intentionally minimal and neutral. The finalized Figma design
system will be mapped into the Tailwind `@theme` block in
`src/app/globals.css` and applied to the primitives in `src/components/ui`.

## Database

```bash
supabase start           # local Supabase stack (requires Docker)
supabase db reset        # apply migrations + seed
supabase gen types typescript --local > src/types/database.types.ts
```

## Next steps

Feature development: onboarding & verification, availability engine, booking and
walk-in flows, calendar, AI concierge prompts, notifications, reporting/BIR
exports, and Figma token mapping.


## Email setup (Resend + Supabase)

The app sends three emails through [Resend](https://resend.com): **account request submitted**, **account approved**
(with a login link) and the **forgot-password code** (4 characters, valid 10 minutes).

1. Create an API key in Resend (key name `FIDES-Development`) and put it in `.env.local` as `RESEND_API_KEY`
   (see `.env.example`). Never commit it.
2. Set `MAIL_FROM_EMAIL`. `onboarding@resend.dev` is a test sender that only delivers to your own Resend account
   email. To email real applicants, verify a domain at <https://resend.com/domains> and use an address on it.
3. Set `NEXT_PUBLIC_SITE_URL` to the public URL: the "log in" link in the approval email is built from it.
4. Run `supabase/migrations/*_password_reset_codes.sql` in the Supabase SQL Editor (forgot-password codes). `supabase db reset` already applies it locally.
5. Check delivery: `npm run email:test` (sends to Resend's `delivered@resend.dev`) or `npm run email:test -- you@example.com`.
6. Optional Edge Function (`supabase/functions/send-fides-email`): set `MAIL_TRANSPORT=edge` and
   `FIDES_EMAIL_FUNCTION_SECRET`, then
   `npx supabase secrets set RESEND_API_KEY=... FIDES_EMAIL_FUNCTION_SECRET=... MAIL_FROM_EMAIL=...` and
   `npx supabase functions deploy send-fides-email --no-verify-jwt`.
7. Supabase Auth emails (confirm / invite / reset / magic link): paste the templates from
   `supabase/email-templates/README.md` and, to send them via Resend, configure custom SMTP as described there.
