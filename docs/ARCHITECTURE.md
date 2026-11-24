# Architecture guide

How Fides is structured, why, where we are today and how we get to a production-ready shape.
This is a **target and rules document**: nothing here requires a rewrite on its own. Features move over one at a time
(see [Migration plan](#9-migration-plan)).

Related docs: [KNOWN-ISSUES](KNOWN-ISSUES.md) (open backlog) · [ENVIRONMENT](ENVIRONMENT.md) · [SECURITY](SECURITY.md) · [FRONTEND](FRONTEND.md)

---

## 1. Summary

- Fides is **one Next.js 16 app** (App Router, React 19, TypeScript) on **Supabase** (Postgres, Auth, Storage, RLS).
  There is no separate Node/Nest/Express API, and we do not need one yet (see [section 2](#2-why-we-do-not-run-a-separate-node-backend)).
- We borrow the **ideas** of the classic controller / DTO / service / repository layering, not the framework.
- The **database is the final security boundary** (RLS and guarded RPCs). TypeScript checks are the first line, not the only one.
- Target: **feature modules** (`src/features/<name>`) with a thin entry layer, zod DTOs, a service for business rules and
  a queries file as the only code that touches Supabase.

## 2. Why we do not run a separate Node backend

| Question | Answer for Fides today |
| --- | --- |
| Do we need an API for other clients (mobile app, partners)? | No. The web app is the only client. |
| Do we have heavy or long-running jobs? | No. Email and billing reminders fit Supabase Edge Functions and cron. |
| Do we need a different scaling profile for the API? | No. Next.js route handlers and server actions scale with the app. |
| Does a second service add risk? | Yes: another deploy, another auth hop (cookies vs tokens), duplicated types, CORS, more secrets. |
| What do Controllers/ORM give us that we lack? | Next.js already provides the entry layer; Supabase provides data access, auth and row-level authorization. |

**Triggers to revisit** (any one is enough to plan a dedicated API service):

1. A native mobile app or a public/partner API is on the roadmap.
2. Background work that exceeds Edge Function limits (large report generation, imports, queues with retries).
3. A second team needs to deploy backend changes independently of the web app.
4. Business logic must be shared by several non-Next clients.

Until then, keep the logic in a framework-agnostic **service layer** inside the app, so extracting it later is a move, not a rewrite.

## 3. Principles

1. **Authorize on the server, enforce in the database.** Every action authenticates and checks tenant access, and RLS/RPC guards back it up.
2. **Parse, don't trust.** All input crosses a boundary through a zod schema (the DTO). Never read `FormData` or a request body in a service.
3. **One place for each concern.** Validation in `schema.ts`, rules in `service.ts`, SQL/Supabase in `queries.ts`, HTTP/form details in the entry file.
4. **Dependencies point inward.** UI/entry → service → queries → database. Never the other way, and never skip a layer.
5. **One result shape, one error vocabulary.** Callers (components) handle a single contract.
6. **Boring and consistent beats clever.** A new feature should look like the last one.
7. **No secrets, tenant ids or roles from the client.** Derive them from the session on the server.

## 4. Layers and responsibilities

Mapping from the familiar Node/Nest vocabulary to this project:

| Layer | Familiar name | Lives in | Responsibility | Must not |
| --- | --- | --- | --- | --- |
| Entry | controller | `src/app/**` server actions, route handlers, pages | Authenticate, parse input with the DTO, call a service, map the result, `revalidatePath` | Contain business rules or Supabase queries |
| DTO | DTO / validation pipe | `src/features/<f>/schema.ts` | zod schemas and inferred input/output types | Import server-only code |
| Guard | guard | `src/lib/auth/*` (tenant, admin) | Resolve the signed-in user and the tenant they may act on | Be skipped or re-implemented per feature |
| Service | service | `src/features/<f>/service.ts` | Business rules, orchestration, calling several queries/RPCs | Know about `FormData`, cookies, `NextResponse` |
| Queries | repository | `src/features/<f>/queries.ts` | The only code that uses the Supabase client for this feature; returns typed rows or domain objects | Contain rules or authorization decisions |
| Database | persistence + policies | `supabase/migrations` | Schema, RLS, constraints, RPCs that must be atomic | Trust the caller (always re-check) |

### 4.1 Request lifecycle

```
Browser form / fetch
   |
   v
Server action or route handler (entry)        <- rate limit, authenticate (guard), parse (DTO)
   |
   v
service.ts                                    <- business rules, orchestration
   |
   v
queries.ts  --Supabase client (user session)--> Postgres
                                                 RLS policies + guarded RPCs (final check)
   |
   v
ActionResult<T> back to the UI                <- revalidatePath / redirect in the entry layer only
```

### 4.2 Reference example

```ts
// src/features/walk-ins/schema.ts  (DTO)
import { z } from "zod";
export const createWalkInSchema = z.object({
  customerName: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(7).max(20),
  serviceId: z.string().uuid(),
  staffId: z.string().uuid().nullable(),
  startsAt: z.string().datetime(),
});
export type CreateWalkInInput = z.infer<typeof createWalkInSchema>;
```

```ts
// src/app/actions/walk-ins.ts  (entry, thin)
"use server";
export async function createWalkInAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createWalkInSchema.safeParse(raw);
  if (!parsed.success) return fail("VALIDATION", firstIssue(parsed.error));
  const access = await requireTenantAccess();            // guard: user + tenant + role
  if (!access.ok) return access;
  const result = await walkInService.create(access.value, parsed.data);
  if (result.ok) revalidateTenantPaths(access.value.tenantSlug, ["walk-ins", "appointments"]);
  return result;
}
```

```ts
// src/features/walk-ins/service.ts  (rules, no HTTP)
export async function create(ctx: TenantContext, input: CreateWalkInInput): Promise<ActionResult<{ id: string }>> {
  if (new Date(input.startsAt) < startOfTodayManila()) return fail("INVALID_TIME", "Pick a time from today onwards.");
  const row = await walkInQueries.createSafe(ctx.supabase, ctx.tenantId, input); // RPC with the DB guard
  return ok({ id: row.appointment_id });
}
```

```ts
// src/features/walk-ins/queries.ts  (only place with Supabase for this feature)
export async function createSafe(supabase: Db, tenantId: string, input: CreateWalkInInput) {
  const { data, error } = await supabase.rpc("create_walkin_appointment_safe", { /* ... */ });
  if (error) throw mapDbError(error);
  return data[0];
}
```

## 5. Target folder structure

```
src/
  app/                          routes only: pages, layouts, actions, route handlers (thin)
    (admin)/ admin/ (site)/ ... existing route groups stay
    actions/                    entry files per feature, e.g. walk-ins.ts (thin)
    api/                        route handlers (public API, webhooks, health)
  features/                     one folder per business capability
    appointments/  walk-ins/  customers/  booking-settings/  website-settings/
    storefront/    applications/ admin-tenants/ admin-tiers/  ...
      schema.ts                 zod DTOs and inferred types
      service.ts                business rules
      queries.ts                Supabase access (server only)
      mappers.ts                db row <-> domain/view model
      components/               UI that belongs to this feature
      index.ts                  public surface of the feature (what others may import)
  components/
    ui/                         design-system primitives (Button, Input, Modal, Card, Icon use)
    auth/ admin/ landing/       shared building blocks used by several features
  lib/                          cross-cutting only, no business logic
    auth/                       requireTenantAccess, requireAdmin, session helpers
    supabase/                   server / client / admin factories (one of each)
    env.ts  rate-limit.ts  mail/  errors.ts  result.ts  log.ts  date-utils.ts  utils.ts
  types/
    database.types.ts           generated: never edit by hand
supabase/
  migrations/                   one concern per migration, forward-only
  functions/                    edge functions (email, scheduled jobs)
  seed.sql                      local demo data only
docs/
```

### 5.1 Import rules (enforced in review, later by lint)

- `app/**` may import from `features/*/index.ts`, `components/*`, `lib/*`.
- `features/<a>` may import another feature only through that feature's `index.ts` (no deep imports).
- `queries.ts` is imported **only** by its own `service.ts`. Pages and components never call Supabase directly.
- `service.ts` never imports from `next/*` (`headers`, `cookies`, `cache`, `navigation`). That stays in the entry layer.
- `components/ui` imports nothing from `features/*` or `lib/supabase`.
- Browser code uses the browser Supabase client only for realtime subscriptions. Reads and writes go through server code.
- `"use client"` files never import server-only modules (`server-only` guards this).

### 5.2 Naming

- Files: `kebab-case.ts(x)`. Components: `PascalCase`. Server actions: `verbNounAction`. Services export plain functions (`create`, `list`, `cancel`).
- DTO types: `<Verb><Noun>Input`. Row types come from `database.types.ts`; view models are named `<Noun>View`.
- Migrations: `NNNNN_short_description.sql`, forward only, never edit one that has been applied elsewhere.

## 6. Cross-cutting contracts

### 6.1 Result and errors

One shape for every action, service and route (replaces today's three conventions):

```ts
type ActionResult<T = void> =
  | { ok: true; value: T; message?: string }
  | { ok: false; code: ErrorCode; error: string; fieldErrors?: Record<string, string> };

type ErrorCode =
  | "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION"
  | "CONFLICT" | "RATE_LIMITED" | "INVALID_STATE" | "INTERNAL";
```

- User-facing `error` text is written for people. Internal details are logged, not returned.
- Database errors are mapped in one function (`mapDbError`): RLS denial, unique violation, the RPC exceptions
  (`UNAUTHORIZED`, `SLOT_UNAVAILABLE`, ...) become `ErrorCode`s.
- Route handlers translate the same codes to HTTP statuses (401, 403, 404, 422, 409, 429, 500).

### 6.2 Authorization

Three independent layers, all required:

1. **Guard** (`requireTenantAccess`, `requireAdmin`): who is calling, which tenant, which role. One implementation, used by every merchant action.
2. **RLS policies**: tenant-scoped on every table, deny by default. Tables with no policy are service-role only.
3. **Guarded RPCs**: anything that must be atomic or cross tables calls `assert_tenant_operator(tenant_id)` first and revokes `anon` execute.

Role model: platform admin (local accounts, `/admin`), tenant `owner | admin | receptionist | staff`, anonymous visitors (storefront, public forms).

### 6.3 Validation, rate limiting, logging

- Validation: zod at the entry layer for **every** action and route (including internal ones). Schemas are exported so forms can reuse them client-side.
- Rate limiting: `limitByClient` on every endpoint an anonymous user can reach and on auth endpoints. Redis in production.
- Logging: a small `log` helper (structured, no personal data, request/tenant ids). `console.*` is for local dev only.

### 6.4 Configuration

- Environment is read through `lib/env.ts` (validated). No `process.env` reads scattered in features.
- Secrets live only in the host's secret store. `.env.example` holds placeholders. See [ENVIRONMENT](ENVIRONMENT.md).

### 6.5 TypeScript and code standards

Types are part of the architecture: a layer boundary is only real if the types at that boundary are real.

**Language rules**

| Rule | Do | Do not |
| --- | --- | --- |
| Strict mode | `"strict": true` (already on) | Loosen compiler flags to silence an error |
| No `any` | `unknown` and narrow it, or parse with zod; generics; `Record<string, unknown>` | `any`, `as any`, `any[]`, untyped catch results |
| No type-check suppression | Fix the type. If unavoidable, `@ts-expect-error` with a one-line reason and a follow-up | `@ts-ignore`, `@ts-nocheck` |
| No non-null assertions | Narrow with a check or return a `NOT_FOUND` result | `value!`, `value!.x` |
| Casts are a last resort | Let inference work; use `satisfies`; map rows through a typed mapper | `as Foo` on database or request data, `as unknown as Foo` |
| Boundaries are parsed | Request/form input: zod `safeParse`. Third-party JSON: zod. Database rows: generated types | Trusting `req.json()`, `FormData` or `JSON.parse` output |
| Types come from one source | `z.infer<typeof schema>` for input, `Database` types for rows, `Tables<"x">` helpers | Hand-written duplicates of a row or schema type |
| Model states, not flags | Discriminated unions (`{ ok: true } | { ok: false }`, status unions from DB enums), exhaustive `switch` with a `never` check | Several optional booleans that can contradict each other |
| Explicit public surface | Explicit return types on exported functions, services, actions, hooks | Inferred return types on code other layers depend on |
| Type-only imports | `import type { X }` | Importing types as values (bundles server code into the client) |
| Immutability | `readonly`, `as const` for constant tables, no mutation of props/inputs | Mutating arguments |
| Errors | Catch `unknown`, narrow, map to `ErrorCode`; never an empty `catch` | `catch (e: any)`, swallowed errors |
| Async | Await or explicitly `void` every promise; no floating promises | Fire-and-forget without a comment |
| Magic values | Named constants or unions for roles, statuses, time zones, limits | Repeating raw strings and numbers across files |
| Exports | Named exports (Next.js special files such as `page.tsx` and `layout.tsx` keep their default export) | Default exports elsewhere |

**Code standards**

- Small units: a file over ~300 lines, a function over ~60 lines or a component with more than ~8 props is a signal to split.
- Comments explain why, not what. No commented-out code. Remove unused code instead of leaving it.
- No dead feature flags, no TODO without an owner and an issue.
- One component per file unless the helpers are private to it. Hooks start with `use` and live next to their feature.
- Tests live next to the code (`*.test.ts`) and test behaviour, not implementation.

**Compiler and lint settings to adopt** (turn on, fix, then enforce in CI):

- `tsconfig`: keep `strict`; add `noUncheckedIndexedAccess`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noImplicitOverride`, `forceConsistentCasingInFileNames`.
- ESLint (as errors): `@typescript-eslint/no-explicit-any`, `no-non-null-assertion`, `ban-ts-comment`, `consistent-type-imports`,
  `no-floating-promises`, `no-misused-promises`, `no-unnecessary-type-assertion`, `switch-exhaustiveness-check`,
  `no-restricted-imports` (the import boundaries from section 5.1), `eqeqeq`, `no-console` (warn, allow `warn`/`error` in the logger only),
  plus `max-lines` (warn at 300).
- CI gate: `tsc --noEmit`, ESLint with zero warnings, tests, `npm audit --omit=dev`.

## 7. Data layer rules

- Schema, RLS and RPCs are **migrations only**, reviewed like code. Never change production through the dashboard.
- Every new table: RLS on, policies in the same migration, indexes on `tenant_id` and foreign keys, `created_at/updated_at`.
- Prefer a **guarded RPC** over multi-step client logic when several writes must succeed together (bookings, conversions, billing).
- Generated types (`supabase gen types`) are the source of truth for rows. Regenerate when migrations change.
- Use the **user-session client** by default. The service-role client is allowed only in: registration/approval flows, password reset codes, mail, admin portal jobs. Each use is commented with the reason.
- Time zone: store UTC, convert at the edge. The business zone helpers live in `lib/date-utils`.
- Soft delete or archive customer-facing records instead of hard delete, unless law/policy requires deletion.

## 8. Frontend structure

- **Server components fetch, client components interact.** Pages call a feature's `queries` through its service and pass plain data to client views.
- Component layers: `components/ui` (primitives) → shared blocks (`auth`, `admin`, `landing`) → feature components.
  Reuse before writing new markup: see [FRONTEND](FRONTEND.md) for buttons, fields, modal, icons, tokens.
- State: URL for filters/pagination where useful, React state for local UI, server actions plus `revalidatePath` for mutations.
  Avoid copying server data into client state unless editing it.
- Forms: use the shared field components, show field errors from `fieldErrors`, disable while pending, handle the `RATE_LIMITED` code.
- Every route segment that loads data gets `loading.tsx`, errors fall back to `error.tsx`, unknown ids call `notFound()`.
- Accessibility and responsiveness are part of done: 390px check, keyboard focus, labels, contrast, reduced motion.

## 9. Migration plan

We do **not** rewrite. We adopt the structure feature by feature, in this order (highest tenant-isolation risk first):

| Phase | Scope | Exit criteria |
| --- | --- | --- |
| 0 | Foundations: `lib/result.ts` (`ActionResult`, `ErrorCode`), `lib/errors.ts` (`mapDbError`), `lib/auth/tenant.ts` (single `requireTenantAccess`), `lib/log.ts`, one Supabase server client | Merged, unit-tested, documented |
| 1 | Pilot: `appointments` + `walk-ins` → `features/` with schema, service, queries | Entry files under ~80 lines, no Supabase in actions, tests for the service |
| 2 | `customers` (largest, 1.3k lines), `booking-settings`, `website-settings` | Same exit criteria, the three inline tenant-guard variants replaced by the shared one |
| 3 | Pages: remove direct Supabase calls from `page.tsx` (use feature queries) and the realtime client in a component | `grep` for `.from(` outside `queries.ts` is empty |
| 4 | Admin, applications, storefront, auth flows | Same shape, admin actions behind `requireAdmin` |
| 5 | Hardening: lint rules for import boundaries, CI gates, e2e smoke tests | CI blocks violations |

Rules while migrating:

- Touch a feature, migrate it (boy-scout rule). Do not leave half-migrated features.
- Behaviour stays identical per step. Each step ships with tests that pin current behaviour first.
- Keep route URLs and component props stable.

## 10. Where we are today

Audit snapshot (honest, so we can measure progress):

| Area | Today | Gap vs target |
| --- | --- | --- |
| Entry layer | 5 large action files: `customers.ts` 1,305 lines, `website-settings.ts` 609, `walk-ins.ts` 498, `appointments.ts` 465, `booking-settings.ts` 331 (35 exported actions) | Entry, rules, mapping and queries are mixed in the same files |
| Validation | zod exists for auth, registration, customers, booking settings, website settings | None for appointments or walk-ins actions; no shared rule that every action validates |
| Result shape | Three conventions: `{ success, ... }` (~89 uses), `{ ok, ... }` (password reset), custom state objects (login, contact, admin login) | One `ActionResult` + `ErrorCode` |
| Tenant guard | Shared `lib/merchant/access.ts` used by `appointments.ts` and `walk-ins.ts`; `customers.ts` (`resolveOperationalAccess`), `booking-settings.ts` and `website-settings.ts` (`authenticateOwner`) each have their own inline variant, so 4 implementations of the same check | One guard everywhere |
| Data access | 11 `page.tsx` files and many actions call Supabase directly; `walk-ins-view.tsx` creates the browser client in a component | Queries only in `queries.ts` |
| Supabase clients | Two server client factories (`lib/supabase/server.ts`, `utils/supabase/server.ts`), admin client, browser client | One factory per kind |
| Feature code location | Spread over `lib/merchant`, `lib/storefront`, `lib/admin`, `lib/applications`, `lib/validations` and `components/*` | `features/<name>` |
| Legacy routes | `/dashboard/*` and `/tenant-dashboard` are redirect stubs next to `/[slug]/dashboard/*` | Remove once nothing links to them |
| Database | RLS on every table, guarded walk-in RPCs, `assert_tenant_operator`, 24 migrations, edge function for email | Good. Add RLS tests and an index review |
| Security controls | Rate limiter (Redis), admin accounts via hashed env, no unauthenticated legacy APIs, 0 audit findings | Keep; add request ids and structured logs |
| Tests | 21 unit tests (date utils only) | No service, RLS or e2e tests |
| Type safety and code standards | See the compliance snapshot below. Most rules are now enforced by the compiler and ESLint | Remaining gaps are listed in KNOWN-ISSUES |
| Observability | `console.*` in a few places, `/api/health` | Structured logging, error tracking, uptime checks |
| UI consistency | Shared button/field/modal/icon/tokens in place | Good. Keep enforcing via [FRONTEND](FRONTEND.md) |

### 10.1 Code standards compliance snapshot

Measured against section 6.5. The full backlog with IDs, locations and fixes is in [KNOWN-ISSUES](KNOWN-ISSUES.md).

| Standard | Today | Status |
| --- | --- | --- |
| `strict`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noImplicitOverride` | On, typecheck clean | Enforced |
| No `any`, no `@ts-ignore`, no non-null `!`, `import type`, no unnecessary assertions | 0 violations, enforced by `npm run lint` | Enforced |
| `no-floating-promises`, `no-misused-promises`, `switch-exhaustiveness-check`, `eqeqeq` | 0 violations, enforced by `npm run lint` (type-aware) | Enforced |
| Lint | 0 errors, 0 warnings | Enforced |
| `npm audit --omit=dev` | 0 vulnerabilities | Enforced by hand, add to CI |
| `noUncheckedIndexedAccess` | 130 errors if turned on (`npm run typecheck:strict`) | Open (T1) |
| No `as unknown as` | 16 in app code, mostly the big action files | Open (T2), root cause is stale generated types (T3) |
| Casts on database rows (`as X`) | about 68 | Open (T4) |
| Default exports only in Next special files | 1 exception (`provider-header.tsx`) | Open (T7) |
| `console.*` | 1 `console.log`, 14 `warn/error` | Open (A10), needs the `log` helper |
| File size (about 300 lines) | 29 files above it, largest `appointments-view` 1,575 | Open (A9), part of the migration |
| `eslint-disable` | 9 lines, each with a reason or a known cause | Open (T8) |
| Zod on every action | Missing for appointments and walk-ins | Open (A4, T5) |
| One result type and one tenant guard | 3 result shapes, 4 guard implementations | Open (A2, A3) |

Turning on a rule that currently fails is part of fixing it: add it to `eslint.config.mjs` or `tsconfig.json` in the same PR.

## 11. Testing strategy

| Level | What | Tooling |
| --- | --- | --- |
| Unit | Services and pure helpers with a fake `queries` module; zod schemas | `node --test` (already set up), add per-feature `*.test.ts` |
| Database | RLS and RPC tests: user A cannot read or change tenant B, anon cannot call guarded RPCs | SQL tests (pgTAP) or a script against local Supabase |
| Integration | Actions end to end against a local Supabase with seed data | Node test runner + local stack |
| End to end | Smoke paths: register, login, create appointment, walk-in, admin approve | Playwright in CI against a preview build |
| Static | `tsc`, ESLint (no warnings), `npm audit --omit=dev` | CI gate |

Definition of done for a feature: schema + service + queries, entry under review rules, service tests, RLS covered, 390px checked,
docs updated if a convention changed.

## 12. Operations and production readiness

- **Environments:** local (Docker Supabase), staging (separate Supabase project), production. Same migrations applied in order everywhere.
- **Deploys:** CI runs typecheck, lint, tests, audit, then deploys. Migrations are applied by CI to staging first, production after approval.
- **Secrets:** host secret store only. Rotate on exposure. Separate keys per environment.
- **Rate limiting:** Redis required in production (`REDIS_URL`).
- **Backups:** Supabase point-in-time recovery enabled; restore drill documented and tested.
- **Monitoring:** error tracking (for example Sentry), uptime check on `/api/health`, log drain with request/tenant ids, alerts on 5xx and rate-limit spikes.
- **Privacy:** no personal data in logs. Customer data export/deletion procedure documented (Philippine Data Privacy Act).
- **Performance:** index every `tenant_id` + filter column, paginate list queries, cache public storefront reads with revalidation.
- **Release safety:** feature flags (env or table) for risky changes, forward-only migrations, rollback plan per release.

## 13. Review checklist (copy into the PR template)

- [ ] Entry file only authenticates, validates, calls a service, returns `ActionResult`.
- [ ] Input parsed by a zod schema; no `FormData`/body fields read in services.
- [ ] Uses `requireTenantAccess` (or admin guard); no tenant id taken from the client without it.
- [ ] No Supabase call outside `queries.ts` (and generated types used).
- [ ] New table or RPC: RLS/guard + policies + indexes in the same migration, `anon` execute revoked where needed.
- [ ] Public endpoint or form: rate limited.
- [ ] Errors mapped to `ErrorCode`; no internal details leaked; no personal data logged.
- [ ] Shared UI reused (see FRONTEND); tokens not hex; checked at 390px.
- [ ] No `any`, `@ts-ignore`, `!` assertions or `as unknown as`; boundary data is parsed, row types are generated.
- [ ] Exported functions have explicit return types; results are discriminated unions.
- [ ] Tests added or updated; lint, typecheck and tests pass.

## 14. Anti-patterns to avoid

- Business logic in `page.tsx`, components or server actions.
- Reading `tenantId` from the request body and trusting it.
- Copy-pasting a guard or a result shape into a new file.
- Using the service-role client "to make the error go away".
- One giant actions file per area. Split by feature.
- Editing an applied migration, or changing production data/policies outside migrations.
- Adding a second backend service before one of the [triggers](#2-why-we-do-not-run-a-separate-node-backend) is real.
