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
