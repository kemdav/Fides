# Fides

Multi-tenant SaaS platform giving local service businesses an official, branded
booking website and a unified management dashboard. Online bookings, phone
requests, and walk-in visits flow through a single scheduling engine, with
tenant isolation enforced at the database layer.

> **Status:** technical foundation only. No user-facing features, domain
> workflows, or screen logic have been implemented yet.

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
| Delivery       | Progressive Web App (manifest + service worker)               |

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the secrets (see "Environment" below)
npm run dev
```

The app boots without any environment values (integrations simply report
misconfiguration at request time), so you can explore the structure first.

## Environment: Supabase Cloud and Docker (one file)

`.env.local` holds the values for **both** databases and one switch at the top:

```
FIDES_DB=CLOUD     # Supabase Cloud project
FIDES_DB=DOCKER    # Supabase in Docker Desktop (npx supabase start)
```

`FIDES_DB` selects the active storefront and tenant database. Registration, password reset, and admin application
review always use the Cloud project configured in section 2 of `.env.local`; keep those Cloud credentials filled
even when `FIDES_DB=DOCKER`. Restart `npm run dev` after changing values. `.env.local` is git-ignored; never commit
the Cloud secret key or Gmail app password.

### Database schema

`supabase/migrations` is the source of truth. Cloud must have the account application, document, and password reset
tables; Docker must have the tenant/storefront schema. They no longer need to be switched together.

- **Docker:** `npx supabase start` then `npx supabase db reset` (applies migrations + `seed.sql`).
- **Cloud:** `npm run db:cloud-sql` regenerates `supabase/cloud-sync.sql`; paste the whole file into
  Supabase Dashboard → SQL Editor → Run. It is idempotent, so run it again whenever a new migration is added.
  (`seed.sql` is never part of it — it creates test users with a known password.)

When you add a migration, give it the next free number — two files must never share a version prefix
(the Supabase CLI rejects duplicates).

## Scripts

| Script              | Purpose                        |
| ------------------- | ------------------------------ |
| `npm run dev`       | Start the dev server           |
| `npm run build`     | Production build               |
| `npm run start`     | Serve the production build     |
| `npm run lint`      | ESLint                         |
| `npm run typecheck` | `tsc --noEmit`                 |

## Project structure

```
src/
  app/                     Next.js App Router
    (site)/                Provider website surface (per-tenant)
    (dashboard)/           Management dashboard surface
    (admin)/               Fides admin portal surface
    auth/callback/         Supabase auth code exchange
    api/health/            Liveness probe
  components/
    ui/                    Headless primitives (Button, Input, Card, Modal)
    layout/                Layout wrappers
    pwa/                   Service worker registration
  lib/
    supabase/              Browser / server / admin clients + session middleware
    tenant/                Wildcard subdomain -> tenant resolution
    ai/                    Gemini concierge wrapper
    mail/                  SMTP transactional mailer
    env.ts                 Validated environment access
  types/
    database.types.ts      Supabase schema types
  proxy.ts                 Next.js 16 proxy (session refresh + tenant routing)
supabase/
  migrations/              SQL migrations (baseline multi-tenant + RLS)
  seed.sql                 Seed data (intentionally empty)
public/                    PWA manifest, service worker, offline shell, icons
```

## Architecture notes

- **Multi-tenant routing.** One Next.js app serves every provider website, the
  dashboard, and the admin portal. `src/proxy.ts` (Next.js 16's replacement for
  `middleware.ts`) resolves the tenant from the request hostname using the
  wildcard subdomain strategy and forwards it via the `x-fides-tenant` header.
- **Tenant isolation.** `supabase/migrations/AUTH/00001_baseline.sql` enables
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


## Email setup

The app sends submission, approval, rejection, and password-reset emails through the configured mail transport.
For local development, `.env.example` uses Gmail SMTP (an app password is required; the sender must match `SMTP_USER`).

1. Set `NEXT_PUBLIC_SITE_URL` to the public URL; approval emails use it for the login link.
2. Run `npm run email:check` for read-only checks. To send a real test through the configured transport, pass an
   explicit recipient with `npm run email:test -- you@example.com` (SMTP and Edge never send to a default address).
3. Optional Resend: set `MAIL_TRANSPORT=resend`, `RESEND_API_KEY`, and a verified `MAIL_FROM_EMAIL` domain.
4. Optional Edge Function (`supabase/functions/send-fides-email`): set `MAIL_TRANSPORT=edge` and
   `FIDES_EMAIL_FUNCTION_SECRET`, then
   `npx supabase secrets set RESEND_API_KEY=... FIDES_EMAIL_FUNCTION_SECRET=... MAIL_FROM_EMAIL=...` and
   `npx supabase functions deploy send-fides-email --no-verify-jwt`.
5. Supabase Auth emails (confirm / invite / reset / magic link): paste the templates from
   `supabase/email-templates/README.md` and, to send them via Resend, configure custom SMTP as described there.
