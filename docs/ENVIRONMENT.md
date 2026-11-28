# Environment variables

Part of the [architecture guide](ARCHITECTURE.md) set (configuration rules are in section 6.4).

Copy `.env.example` to `.env.local` and fill it in. Never commit `.env.local`.
Restart `npm run dev` after any change.

| Variable | Required | What it is |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | yes | Public URL of the app. Used in emails (login link) and SEO. |
| `NEXT_PUBLIC_PLATFORM_DOMAIN` | yes | Domain used to resolve tenant subdomains. `localhost:3000` locally. |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase API URL. `http://127.0.0.1:55421` for the local stack (see `supabase/config.toml`). |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Supabase anon/publishable key. |
| `SUPABASE_SECRET_KEY` | yes (server) | Service-role key. Server only, never expose it to the browser. |
| `ADMIN_SESSION_SECRET` | production | Random string of 32+ characters that signs the admin session cookie. Without it (dev only) a throwaway key is used and admin sessions end on restart. |
| `ADMIN_ACCOUNTS` | for admin login | JSON array of admins with hashed passwords (below). |
| `REDIS_URL` | production | Redis connection for rate limiting (below). |
| `MAIL_TRANSPORT`, `SMTP_*`, `MAIL_FROM_*` | for email | Transactional email. See the email section in the README. |
| `RESEND_API_KEY` | optional | Only if you switch the mailer to Resend. |
| `GEMINI_API_KEY`, `GEMINI_MODEL`, `AI_CONCIERGE_TIMEOUT_MS` | optional | AI concierge. |

## Admin accounts

Admin logins are not in Supabase and not in the repo. They come from `ADMIN_ACCOUNTS`, a single-quoted JSON array:

```env
ADMIN_ACCOUNTS='[{"id":"admin-1","username":"admin@example.com","displayName":"Admin","passwordHash":"scrypt:<salt>:<hash>"}]'
```

1. Pick a unique password of 12+ characters for each admin.
2. Run `node scripts/hash-admin-password.mjs "<password>"` and paste the output as `passwordHash`.
3. Give every admin a different `id` and password. Restart the server.

Quick local setup: run `npm run setup:admin`. It adds `ADMIN_SESSION_SECRET` and one admin (`admin@fides.local`, random password printed once) to `.env.local` when they are missing, and skips them if they exist. Use `-- --username you@example.com` to pick the username.

Admins sign in at `/admin/login`. The first time you pull the branch that introduced this, add `ADMIN_ACCOUNTS`
to your own `.env.local` or admin login will say the credentials are wrong.

## Redis (rate limiting)

Login, admin login, password reset, staff access and email verification, customer invitations, registration codes and submissions, staged uploads, slug checks, storefront APIs, and both contact forms use the shared limiter in `src/lib/rate-limit.ts`. The liveness probe stays independent of Redis.

- **Local:** `docker compose up -d redis` starts Redis on loopback port **6380**.
  Set `REDIS_URL=redis://localhost:6380`.
- **No `REDIS_URL`:** limits fall back to an in-memory counter. Fine for a single dev server, but it resets on restart
  and is not shared between server instances.
- **Redis down:** the app logs one warning and falls back to the in-memory counter instead of failing requests.
- **Production:** set `REDIS_URL` before starting Next.js. Use a managed Redis and `rediss://` for TLS. The Node.js server validates the setting at startup.
  Counters use the `fides:rl:` prefix and expire automatically. Redis keys use hashed client identifiers.

## Local Supabase

`supabase start` then `supabase db reset` applies every migration and the seed. Seed logins:

| Who | Login | Password |
| --- | --- | --- |
| Bella Vita owner | `owner@bellavita.com` | `Password123!` |

Local-only passwords. Never reuse them anywhere real.
