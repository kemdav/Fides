# Known issues and tech-debt backlog

Everything we know is not yet at production standard, in one place, so anyone can pick an item up.
Companion to the [architecture guide](ARCHITECTURE.md) (rules and target structure). When you fix an item, delete or update its row in the same PR.

How to read this:

- **Severity:** `P1` fix before launch · `P2` fix soon, risk or friction grows · `P3` cleanup, do when you touch the area.
- **Effort:** `S` under half a day · `M` one to two days · `L` several days or one per feature.
- Counts were measured on the `CPG-134-restore-admin-frontend` branch. Re-measure with the commands in [section 12](#12-how-to-re-measure).

## Status at a glance

| Check | Result |
| --- | --- |
| `npm run typecheck` | Clean (with `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noImplicitOverride` on) |
| `npm run lint` | 0 errors, 0 warnings, and now type-aware: no floating or misused promises, no unnecessary assertions, no non-null `!`, no `any`, no `@ts-ignore`, `import type` enforced |
| `npm test` | 21 passing (all in `date-utils`) |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm run typecheck:strict` (adds `noUncheckedIndexedAccess`) | 130 errors, tracked in issue T1 |

---

## 1. Type safety

| ID | Issue | Where | Sev | Effort | Fix |
| --- | --- | --- | --- | --- | --- |
| T1 | `noUncheckedIndexedAccess` is off. Turning it on gives 130 errors. | `laptop-svg` 26, `overview-view` 24, `lib/merchant/overview.ts` 11, `date-utils.test` 11, `appointments-view` 8, `new-appointment-modal` 7, `admin/select` 4, `register-flow` 4, ~25 more files (3 or fewer each) | P3 | M | Narrow array and record reads (`const x = list[i]; if (!x) return`), or use `.at()` / `find`. Fix file by file, then add the flag to `tsconfig.json`. Check progress with `npm run typecheck:strict`. |
| T2 | `as unknown as` double casts (16 in app code). **Root cause is stale generated database types** (below, T3), so queries are cast to a loose client. | `actions/customers.ts` (10: lines 332, 519, 767, 858, 895, 936, 986, 1050, 1085, 1171), `actions/booking-settings.ts` (163, 293), `actions/walk-ins.ts` (295, 465), `actions/website-settings.ts` (238), `(site)/[slug]/contact/actions.ts` (58) | P2 | M | Fix T3 first, then delete the casts. Any cast that remains needs a one-line reason. |
| T3 | `src/types/database.types.ts` is hand-merged and out of date: no `customer_invitations`, `inquiries`, or the walk-in RPCs (`create_walkin_appointment_safe`, `convert_waitlist_entry_to_appointment`, `assert_tenant_operator`). The account-flow tables are typed by hand-written helpers. | `src/types/database.types.ts`, `src/lib/applications/service.ts` | P2 | M | Regenerate with `supabase gen types typescript` and move the hand-written row aliases (`AccountApplicationRow`, `ActivityCategory`, ...) to a small `src/types/database.helpers.ts`. A dry run showed regeneration compiles with only 8 errors, all in `applications/service.ts` (missing aliases and two insert types). Note the 3.x CLI prints a different format than before, so review the diff. |
| T4 | About 68 `as X` casts on rows or request data (22 in `actions/customers.ts`, 5 in `new-appointment-modal`, 3 in `booking-settings-view`, then 1-2 elsewhere). | See counts | P2 | M | Typed mappers (`row -> view model`) and zod parsing at the boundary. |
| T5 | Several actions read a `tenantId`/ids from arguments typed as plain `string` with no validation. | `actions/appointments.ts`, `actions/walk-ins.ts` | P1 | M | zod schema per action (uuid, date, enum). See [ARCHITECTURE 4.2](ARCHITECTURE.md). |
| T6 | Exported functions without explicit return types, and result unions that are not discriminated. | Most of `lib/` and `actions/` | P3 | L | Add as each feature migrates. |
| T7 | One default export outside Next special files. | `components/landing/provider-header.tsx` | P3 | S | Switch to a named export and update the import. |
| T8 | 9 `eslint-disable` lines. Two for `<img>` previews are fine; seven silence `react-hooks/set-state-in-effect` or `exhaustive-deps` in modals. | `new-appointment-modal` (457, 459, 464), `walk-in-modal` (86, 91, 128), `assign-slot-modal` (92), `register/controls` 515, `register-flow` 664 | P3 | M | Rework the modals so state resets by `key` or derived state instead of effects, then drop the disables. |

## 2. Architecture and structure

Full target in [ARCHITECTURE](ARCHITECTURE.md). Open items:

| ID | Issue | Where | Sev | Effort |
| --- | --- | --- | --- | --- |
| A1 | Actions mix input parsing, tenant checks, rules and Supabase queries. 35 exported actions in 5 large files. | `customers.ts` 1,305 lines, `website-settings.ts` 609, `walk-ins.ts` 498, `appointments.ts` 465, `booking-settings.ts` 331 | P2 | L (per feature) |
| A2 | The same tenant check exists 4 times: shared `lib/merchant/access.ts` (appointments, walk-ins) plus inline copies in `customers.ts` (`resolveOperationalAccess`), `booking-settings.ts` (`resolveTenantAccess`) and `website-settings.ts` (`authenticateOwner`). | See left | P1 | M |
| A3 | Three result conventions (admin now uses `lib/result.ts`, the target shape): `{ success }` (~89 uses), `{ ok }` (password reset), custom state objects (login, contact, admin login). | `actions/*` | P2 | M |
| A4 | Validation missing for appointments and walk-ins actions (zod exists for auth, registration, customers, booking settings, website settings). | `actions/appointments.ts`, `actions/walk-ins.ts` | P1 | M |
| A5 | Pages and one client component talk to Supabase directly: 11 `page.tsx` files, and `walk-ins-view.tsx` creates the browser client. | `(site)/[slug]/dashboard/**`, legacy `/dashboard/**`, `tenant-dashboard` | P2 | M |
| A6 | Feature code is spread across `lib/merchant`, `lib/storefront`, `lib/admin`, `lib/applications`, `lib/validations` and `components/*`. | `src/lib/**` | P3 | L |
| A7 | Legacy routes duplicate `/[slug]/dashboard/*`: `/dashboard`, `/dashboard/appointments`, `/dashboard/customers`, `/dashboard/settings/booking`, `/dashboard/settings/website`, `/dashboard/walk-ins`, `/tenant-dashboard`. They only redirect. | `src/app/dashboard/**`, `src/app/tenant-dashboard` | P3 | S (after checking nothing links to them) |
| A8 | Stray files: `database.types.new.ts` (repo root, unused), `test-resend.mjs`, stale `CHANGES.md`, `docs/archived/`. | repo root | P3 | S |
| A9 | 29 files are over about 300 lines. Largest: `appointments-view` 1,575, `customers.ts` 1,305, `register-flow` 1,108, `overview-view` 1,086, `website-settings-view` 1,069, `lib/applications/service.ts` 1,068, `booking-settings-view` 917, `new-appointment-modal` 911, `customer-modals` 789, `customers-registry-view` 773, `customer-profile-view` 736, `register/controls` 718. | See [ARCHITECTURE 10.1](ARCHITECTURE.md) | P3 | L |
| A10 | No structured logger. 1 `console.log` (mailer sends) and 14 `console.warn/error` in routes, services and mailer. | `lib/mail/mailer.ts` (4), `lib/applications/service.ts`, `lib/auth/password-reset.ts`, `actions/password-reset.ts`, `api/**`, `lib/merchant/overview.ts`, `lib/rate-limit.ts`, `pwa/service-worker-register.tsx` | P2 | S |

## 3. Security and data

Controls that exist are listed in [SECURITY](SECURITY.md). Still open:

| ID | Issue | Sev | Effort | Notes |
| --- | --- | --- | --- | --- |
| S1 | The old Gmail app password is still in git history. | P1 | S | Revoke it in the Google account (history rewrite is optional). |
| S8 | **Apply `close_client_write_holes` to the hosted database.** Until then, on hosted: signed-in users can change their own role and tenant, and the public key can read and edit registration applications and the admin log. Also check hosted data for unexpected admin profiles, tenant moves and edited applications. | P1 | S | Migration `20261126140000_close_client_write_holes.sql` applies on its own. |
| S9 | An owner can still set any amount on a reactivation invoice they create. | P2 | S | Generate invoices only on the server (ADMIN-BACKEND step 4). |
| S2 | Admin accounts have no password reset screen and no MFA. "Forgot password" on `/admin/login` is design only, and the Figma MFA and "unauthorized role" states are not wired. | P2 | M | Both are available now that admins use Supabase Auth. Planned in [ADMIN-BACKEND](ADMIN-BACKEND.md) step 7. |
| S3 | RLS and grant checks cover admin access and the main client write paths (`npm run test:db`). Tenant A versus tenant B reads and the walk-in RPC guards are still untested. | P2 | M | Extend `scripts/tests/`. |
| S4 | The in-memory rate-limit fallback is per process. | P2 | S | Production must set `REDIS_URL`. Add a startup warning check in the deploy checklist. |
| S5 | `GET /api/tenant/website-settings` and the storefront services route use the service-role client for public reads. Intentional, but each should be reviewed for exactly the columns returned. | P3 | S | |
| S6 | Contact forms (global and storefront) send mail or insert rows with no spam challenge beyond the honeypot and rate limit. | P3 | S | Consider a captcha if abuse appears. |
| S7 | The admin screens still show sample data, and nothing calls the approval service, so new applications cannot be approved. | P1 | L | Tracked step by step in [ADMIN-BACKEND](ADMIN-BACKEND.md). |

## 4. Testing

| ID | Issue | Sev | Effort |
| --- | --- | --- | --- |
| Q1 | Only `date-utils` has tests (21). No tests for services, schemas, guards or actions. | P1 | L (grows with the migration) |
| Q2 | No end-to-end tests. Smoke checks (logins, dialogs, 390px overflow) were run by hand with throwaway scripts that are not in the repo. | P2 | M (Playwright against a preview build, commit the scripts) |
| Q3 | These flows were not exercised by automation and need a manual or e2e check: admin "Approve" verification dialog, assign-slot modal (needs a waiting-list entry), appointment cancel dialog on a phone, registration steps 3 to 6, password reset end to end. | P2 | M |

## 5. CI, operations and observability

| ID | Issue | Sev | Effort |
| --- | --- | --- | --- |
| O1 | No CI workflow (no `.github/workflows`). Typecheck, lint, tests and audit are only run by hand. | P1 | S |
| O2 | No PR template with the review checklist from [ARCHITECTURE 13](ARCHITECTURE.md). | P2 | S |
| O3 | No error tracking, uptime monitor or log drain. `/api/health` exists but nothing watches it. | P1 | M |
| O4 | Migrations are applied by hand. Staging and production pipelines are not defined. | P1 | M |
| O5 | Backup and restore drill not documented or tested. | P1 | S |
| O6 | Data privacy procedures (export and deletion of customer data) not written. | P2 | M |
| O7 | Lint is type-aware now, so `npm run lint` is slower. Cache it in CI. | P3 | S |

## 6. Frontend and UX

| ID | Issue | Where | Sev | Effort |
| --- | --- | --- | --- | --- |
| F1 | `AdminModal` is a thin wrapper kept for admin dialog widths and the title id. Could become a `size` prop on the shared `Modal`. | `components/admin/admin-modal.tsx` | P3 | S |
| F2 | `ui/CheckIcon` (two-colour disc and tick) has no single-colour Solar equivalent. | `components/ui/check-icon.tsx` | P3 | S |
| F3 | Literal colours that are intentional or art: email HTML, `themeColor`, OpenGraph image, tenant brand defaults, colour-picker and preview colours, fox and laptop SVGs. 17 one-off `shadow-[...rgb()]` values. | various | P3 | S |
| F4 | 9 to 11px text remains in admin charts and the Figma-spec "Go to fides.app" link. | `admin/overview/*`, `auth/admin-auth-shell.tsx` | P3 | S |
| F5 | The register flow still owns its step layout. The upload and summary steps share document categories. Browser drafts save form details only. The larger step layout is still a candidate for extraction. | `src/app/register/**` | P3 | L |
| F6 | `book-settings` icon is a Solar notebook plus gear composed by hand (no single Solar icon). `shield` is only partly Solar. | `admin/icon-data.ts` | P3 | S |
| F7 | `loading.tsx` exists only for the merchant dashboard and admin. Other data pages, including storefront pages, have none. | `src/app/**` | P3 | S |
| F8 | Accessibility pass not done: keyboard order in dialogs with nested dropdowns, screen reader labels on icon-only buttons, colour contrast on `subtle` text over tinted cards. | whole app | P2 | M |
| F10 | Admin approval surfaces missing industry licenses on pending applications. Applicants who submitted while those documents were deferred still need a way to add them to an existing application. | `src/lib/applications/service.ts` | P2 | M |
| F9 | Add Business Verification under Website / Account Settings. Group deferred documents under Invoicing & BIR Tax Exports (ATP/PTU, service invoices, registered books), Public Storefront & Online Payouts (address proof, barangay clearance, community tax certificate, zoning clearance, fire safety certificate), and Staff Health & Regulated Services (LGU health cards, pathogen and sterilization training). Apply each group's requirements when enabling the associated capability. | `src/lib/registration/document-requirements.ts` | P2 | L |

## 7. Documentation and process

| ID | Issue | Sev | Effort |
| --- | --- | --- | --- |
| D1 | `README.md` email section describes Resend while the default is Gmail SMTP. | P3 | S |
| D2 | `CHANGES.md` is stale. Replace with release notes generated from PRs, or delete. | P3 | S |
| D3 | No `CONTRIBUTING.md` (branching, commit style, PR checklist). `AGENTS.md` has the rules for agents. | P2 | S |
| D4 | No architecture decision records (ADRs). Start with "single Next.js app on Supabase, no separate backend". | P3 | S |

## 8. Suggested order of work

1. **Safety net first (P1):** O1 CI, Q1/S3 tests around the tenant guard and RLS, S1 revoke the old secret, O3 error tracking.
2. **Pilot migration:** `appointments` and `walk-ins` into `features/` with T5/A4 schemas, A2 the single guard, A3 one result type ([ARCHITECTURE section 9](ARCHITECTURE.md)).
3. **Type root cause:** T3 regenerate database types, then T2/T4 remove casts feature by feature.
4. **Next features:** customers, booking settings, website settings (A1, A5, A9).
5. **Hardening:** T1 `noUncheckedIndexedAccess`, S2 admin reset/MFA, Q2 e2e, F8 accessibility.

## 9. Fixed recently (for context)

Unauthenticated account-request API removed; tenant checks added to walk-in and appointment-status actions; walk-in RPC guard
(`assert_tenant_operator`, migration `rpc_tenant_guard`); rate limiting with Redis; admin accounts moved to Supabase Auth with a `platform_admins` table; patched `next`, `zod`,
`nodemailer`; shared `Modal`, `Button`, field and icon components; token-based colours and shadows; 404, error and loading pages;
all lint warnings; type-aware lint rules and three extra compiler flags enabled.

## 10. Rules for working through this list

- One issue (or one tight group) per PR, with the ID in the title.
- Add or update tests with the fix. For migrations of a feature, pin current behaviour with tests first.
- Update this file in the same PR (remove the row or change its numbers).
- Do not add new `any`, casts or direct Supabase calls while you are in there. The linter blocks most of it.

## 11. Owners

Assign an owner per row in the project board, not in this file, so it does not go stale.

## 12. How to re-measure

```bash
npm run typecheck          # compiler (strict + the 3 extra flags)
npm run typecheck:strict   # adds noUncheckedIndexedAccess, expect 130 errors until T1 is done
npm run lint               # type-aware ESLint, must stay at 0 errors and 0 warnings
npm test                   # unit tests
npm audit --omit=dev       # dependencies

grep -rn "as unknown as" src --include=*.ts --include=*.tsx            # T2
grep -rnE "console\.(log|warn|error)" src                                # A10
grep -rn "eslint-disable" src                                            # T8
grep -rlE "\.from\(" src/app --include=page.tsx                          # A5
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -nr | head   # A9
```
