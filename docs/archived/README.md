# Archived code

`legacy-tenant-dashboard/` is the old, unused dashboard that previously lived at `src/app/tenant-dashboard`.
It was not linked from login or the auth flow (those used `/dashboard`). The live, access-checked dashboard
(previously `(dashboard)/dashboard`) now lives at `src/app/(dashboard)/tenant-dashboard` and is served at
`/tenant-dashboard`, so the two could not coexist. The legacy files are kept here for reference only and
are not part of the app (this folder is excluded from the TypeScript build).
