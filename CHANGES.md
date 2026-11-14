# Changes in this build

- Registration UI aligned to Figma (stepper spacing, fields, buttons, plan cards), custom date picker and ID-type dropdown, eye/eye-off password toggle.
- "Back to home" on Account Creation and Login.
- Validation: PH mobile numbers (09XXXXXXXXX or +63 9XXXXXXXXX, no letters), required documents, login field errors.
- All 7 documents required (government ID + 6 business documents); preview / replace / remove / re-upload before submit.
- New table `application_documents` (+ `document_types`) and private bucket `application-documents`: run `SUPABASE_DOCUMENT_REQUIREMENTS.sql` in the Supabase SQL Editor BEFORE deploying.
- Admin verification panel lists every document (Uploaded/Missing) with View / Download via 5-minute signed URLs.
- Owner dashboard moved to `/tenant-dashboard` (was `/dashboard`); admin label "Business owner" -> "Tenant owner".
- Login: owner-only check, ?error= / ?message= banners, allow-listed ?redirect=.
- Old unused dashboard archived in `docs/archived/`.

Notes: `.env.local` is not included - keep your own. `/api/applications` is excluded from `src/proxy.ts` so 7x5 MB uploads are not truncated.

## Email fixes (Resend + Supabase)
- `src/lib/mail/mailer.ts`: mascot image is now optional (a missing file no longer makes every email fail); clearer Resend errors; new `MAIL_TEST_RECIPIENT` redirects mail to your own inbox while the Resend test sender is in use, so all three flows can be tested before a domain is verified.
- `supabase/migrations/00013_password_reset_codes.sql`: now refreshes the API schema cache after creating the table. RUN IT in the Supabase SQL Editor (forgot-password stores its codes there).
- Forgot-password popup: state resets without an effect (lint error fixed); final step does a full reload of `/login`.
- New `npm run email:check` verifies .env.local, Resend sender/domain and the Supabase tables. `npm run email:check -- you@mail.com` also sends a real test email.
