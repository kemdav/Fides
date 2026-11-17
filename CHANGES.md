# Changes in this build

## Environment + database alignment (Cloud and Docker)
- One `.env.local` for both databases: set `FIDES_DB=CLOUD` or `FIDES_DB=DOCKER`; all variable-name variants are filled automatically. New `.env.example` documents it.
- `supabase/migrations` renumbered so every version is unique (00012/00013/00014 were each used twice, which the Supabase CLI rejects).
- New `AUTH/00012_account_applications.sql`: the account/auth tables (`account_applications`, `subscription_plans`, `admin_activity_log`, `business-logos` bucket, …) used to exist only in a hand-run SQL script, so Docker never had them.
- `AUTH/00000_complete_setup.sql`: fixed an untyped NULL that made the first migration fail on an empty database.
- `seed.sql`: removed a stray `@` line that broke `supabase db reset`.
- New `npm run db:cloud-sql` → `supabase/cloud-sync.sql` (all migrations as one idempotent script for the Supabase Cloud SQL Editor).
- `email:check` / `email:test` load `.env.local` with Next's loader; the checks honor the selected SMTP, Resend, or Edge transport.
- Duplicate manual scripts consolidated with their canonical SQL in `supabase/migrations/AUTH/`.

- Registration UI aligned to Figma (stepper spacing, fields, buttons, plan cards), custom date picker and ID-type dropdown, eye/eye-off password toggle.
- "Back to home" on Account Creation and Login.
- Validation: PH mobile numbers (09XXXXXXXXX or +63 9XXXXXXXXX, no letters), required documents, login field errors.
- All 7 documents required (government ID + 6 business documents); preview / replace / remove / re-upload before submit.
- New table `application_documents` (+ `document_types`) and private bucket `application-documents`: run `AUTH/00013_application_documents.sql` in the Supabase SQL Editor BEFORE deploying.
- Admin verification panel lists every document (Uploaded/Missing) with View / Download via 5-minute signed URLs.
- Owner dashboard moved to `/tenant-dashboard` (was `/dashboard`); admin label "Business owner" -> "Tenant owner".
- Login: owner-only check, ?error= / ?message= banners, allow-listed ?redirect=.
- Old unused dashboard archived in `docs/archived/`.

Notes: `.env.local` is not included - keep your own. `/api/applications` is excluded from `src/proxy.ts` so 7x5 MB uploads are not truncated.

## Email fixes (Resend + Supabase)
- `src/lib/mail/mailer.ts`: mascot image is now optional (a missing file no longer makes every email fail); clearer Resend errors; new `MAIL_TEST_RECIPIENT` redirects mail to your own inbox while the Resend test sender is in use, so all three flows can be tested before a domain is verified.
- `supabase/migrations/AUTH/00015_password_reset_codes.sql`: now refreshes the API schema cache after creating the table. Run it in the Supabase SQL Editor (forgot-password stores its codes there).
- Forgot-password popup: state resets without an effect (lint error fixed); final step does a full reload of `/login`.
- `npm run email:check` validates the selected mail transport and Cloud account tables. `npm run email:test -- you@mail.com` sends through the configured transport; SMTP/Edge require an explicit recipient.

## Separate Cloud account backend
- Registration, account review, document storage, and password reset now use the dedicated Supabase Cloud connection. The active Docker connection remains in place for storefront and tenant data.
- Sign-in and the account dashboard recognize Cloud application accounts as well as existing active-database accounts.
