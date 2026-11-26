# Environment variables

Part of the [architecture guide](ARCHITECTURE.md) set (configuration rules are in section 6.4).

Copy `.env.example` to `.env.local` and fill it in. Never commit `.env.local`.
Restart `npm run dev` after any change.

| Variable | Required | What it is |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | yes | Public URL of the app. Used in emails (login link) and SEO. |
| `NEXT_PUBLIC_PLATFORM_DOMAIN` | yes | Domain used to resolve tenant subdomains. `localhost:3000` locally. |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase API URL. `http://127.0.0.1:55321` for the local stack (see `supabase/config.toml`). |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Supabase anon/publishable key. |
| `SUPABASE_SECRET_KEY` | yes (server) | Service-role key. Server only, never expose it to the browser. |
| `REDIS_URL` | production | Redis connection for rate limiting (below). |
| `MAIL_TRANSPORT`, `SMTP_*`, `MAIL_FROM_*` | for email | Transactional email. See the email section in the README. |
| `RESEND_API_KEY` | optional | Only if you switch the mailer to Resend. |
| `GEMINI_API_KEY`, `GEMINI_MODEL`, `AI_CONCIERGE_TIMEOUT_MS` | optional | AI concierge. |

## Admin accounts

Platform admins are ordinary Supabase Auth accounts that also have an active row in `public.platform_admins`.
Only the server can write that table. There are no admin environment variables.

- **Local:** `supabase db reset` seeds `admin@fides.app`; the password is the seed password in `supabase/seed.sql`.
- **Hosted:** apply the migrations, point `.env.local` at that project, then run
  `npm run admin:create -- --email you@example.com --name "Your Name"`. It prints a one-time password.
- **Turn one off:** `npm run admin:create -- --email you@example.com --disable`. It takes effect on their next request.
- The script refuses to promote an existing account, so a merchant login can never become an admin by accident.

Admins sign in at `/admin/login`. `/login` rejects them. A browser holds one Supabase session at a time, so
signing in as an admin signs that browser out of a merchant account.

## Redis (rate limiting)

Login, admin login, password reset, registration submissions and both contact forms are rate limited
(`src/lib/rate-limit.ts`).

- **Local:** `docker compose up -d redis` starts Redis on host port **6380** (so it does not clash with another Redis on 6379).
  Set `REDIS_URL=redis://localhost:6380`.
- **No `REDIS_URL`:** limits fall back to an in-memory counter. Fine for a single dev server, but it resets on restart
  and is not shared between server instances.
- **Redis down:** the app logs one warning and falls back to the in-memory counter instead of failing requests.
- **Production:** use a managed Redis (for example Upstash, Redis Cloud or your host's add-on) and set `REDIS_URL`
  (use `rediss://` for TLS). Counters are stored under the `fides:rl:` prefix and expire on their own.

## Local Supabase

`supabase start` then `supabase db reset` applies every migration and the seed. Seed logins:

| Who | Login | Password |
| --- | --- | --- |
| Bella Vita owner | `owner@bellavita.com` | `Password123!` |

Local-only passwords. Never reuse them anywhere real.
