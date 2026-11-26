<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:fides-project-rules -->

## Fides project rules (read before changing code)

Fides is one Next.js 16 app (App Router, React 19, TypeScript, Tailwind v4) on Supabase (Postgres, Auth, Storage, RLS).
There is no separate backend. Read these first, they are short:

- `docs/ARCHITECTURE.md`: layers, folder structure, rules, current state, migration plan, review checklist
- `docs/KNOWN-ISSUES.md`: open backlog with IDs. Check it before touching an area, and update it in the same change
- `docs/SECURITY.md`: access layers and rules for new code
- `docs/FRONTEND.md`: shared components, tokens, icons, responsive checklist
- `docs/ENVIRONMENT.md`: environment variables, admin accounts, Redis

### Commands

`npm run dev` · `npm run typecheck` · `npm run lint` (type-aware, must have 0 errors and 0 warnings) · `npm test` · `npm audit --omit=dev` ·
`npm run typecheck:strict` (measures the remaining `noUncheckedIndexedAccess` work).
Local database: `docker compose up -d redis`, `supabase start`, `supabase db reset`.

### Non-negotiables

1. **Layering.** Entry (server action / route handler) authenticates, validates with a zod schema, calls a service and returns one result shape.
   Business rules live in a service, Supabase calls only in a queries file. No business logic or direct Supabase calls in `page.tsx`, components or actions.
   Existing code is being migrated feature by feature, so follow the target structure for anything you touch or add.
2. **Tenant safety.** Never trust a tenant id or role from the client. Use the shared guard (`lib/merchant/access.ts` `resolveTenantAccess`, admin helpers in `lib/admin`).
   Do not copy the guard into a new file.
3. **Database is the boundary.** New table: RLS and policies in the same migration. New `SECURITY DEFINER` function: set `search_path`, call `assert_tenant_operator`, revoke `anon`.
   Migrations are forward-only; never edit an applied one; never change production outside migrations.
4. **Public inputs are rate limited** (`limitByClient` in `lib/rate-limit.ts`) and validated.
5. **No secrets in the repo.** Placeholders only in `.env.example`. Admin accounts come from hashed `ADMIN_ACCOUNTS`.
6. **UI reuse.** Use `buttonClasses` / `Button`, `inputClasses`, `Modal`, `Icon` (Solar set), `MetricCard` and the colour/shadow tokens from `src/app/globals.css`.
   No hex colours, default Tailwind palette colours, hand-rolled modal overlays or inline SVG icons. Sizes follow Figma (see `docs/FRONTEND.md`).
7. **Responsive and accessible.** Check new screens at 390px: no horizontal scroll, labels visible, focus visible, text not smaller than 12px.
8. **No personal data in logs**, errors or URLs.
9. **TypeScript discipline.** Strict mode. No `any`, `@ts-ignore`, non-null `!` or `as unknown as`. Parse boundary data with zod, use generated database types,
   explicit return types on exported functions, discriminated-union results, `import type` for types. Details: `docs/ARCHITECTURE.md` section 6.5.

### Working style

- Verify before claiming done: typecheck, lint and tests pass, and the changed screens were opened in a browser (desktop and 390px).
- Keep changes focused and consistent with neighbouring code. If you find a convention conflict, follow `docs/ARCHITECTURE.md` and mention it.
- Comments and commit messages are lowercase, short and say why. No co-author lines.
- Ask before destructive actions (dropping data, force-pushing, resetting shared environments).

<!-- END:fides-project-rules -->

## Supabase migrations

Name each new migration in `supabase/migrations` with the current UTC timestamp as its prefix, using `YYYYMMDDHHMMSS_description.sql`. Use distinct timestamps in application order when adding multiple migrations.

## Full-screen loading states

Reuse [`MascotLoadingDialog`](src/components/ui/mascot-loading-dialog.tsx) when a pending operation blocks the whole screen. Render it only while the operation is pending and pass a short `label` when it helps explain the wait.
