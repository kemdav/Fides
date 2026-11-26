# Hotfix: client access holes

Migration: `supabase/migrations/20261126140000_close_client_write_holes.sql`

## What was open

Found on a local database built from `main`'s migrations. The hosted database has not been checked.

| Who | Could do |
| --- | --- |
| Anyone with the public key, no login | Read and change registration applications, read applicant identity and business rows, add and delete admin activity log entries |
| Any signed-in user | Change their own `role` (including to platform admin) and move their profile to another business |
| Staff | Add themselves as an owner of the business |
| Business owner | Lift their own suspension, change their plan or subscription dates, create an invoice already marked paid or a payment proof already verified |
| Anyone, no login | Call `manage_staff_profile`, which trusts the actor id it is given |

Cause: Supabase grants new tables and functions to `anon` and `authenticated` by default, five tables had row level
security off, and a column-level grant or `revoke ... from public` does not remove those defaults.

## Local

```bash
git pull                      # get the migration
docker compose up -d redis
supabase start
supabase db reset             # wipes LOCAL data and applies every migration plus the seed
npm run test:db               # 7 access checks, all should pass
npm run dev
```

`supabase db reset` only touches the local database. Never point it at the hosted project.

`supabase/config.toml` on `main` now uses ports `554xx`. If you keep your own ports, make sure
`NEXT_PUBLIC_SUPABASE_URL` in `.env.local` matches the API port you actually run.

## Hosted

Do these in order. Nothing here deletes data.

**1. Back up.** Dashboard → Database → Backups. Confirm a recent backup exists.

**2. Apply the fix.** Dashboard → SQL Editor → paste the whole migration file → Run.
It is one transaction: if any statement fails, nothing changes. A "does not exist" error means the hosted database is
missing an earlier migration; stop and apply the missing ones first.

**3. Verify.** Run this; every column must be `false`:

```sql
select
  has_table_privilege('anon', 'public.account_applications', 'select')                  as anon_reads_applications,
  has_table_privilege('anon', 'public.admin_activity_log', 'insert')                    as anon_writes_log,
  has_column_privilege('authenticated', 'public.profiles', 'role', 'update')            as users_change_role,
  has_column_privilege('authenticated', 'public.profiles', 'tenant_id', 'update')       as users_change_tenant,
  has_column_privilege('authenticated', 'public.subscriptions', 'status', 'update')     as owners_change_status,
  has_function_privilege('anon', 'public.reserve_staff_email_change(uuid)', 'execute')  as anon_calls_server_function,
  exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity)      as tables_without_rls;
```

**4. Look for signs of abuse.** Closing the holes does not undo anything already changed. Review every row returned:

```sql
-- who is currently a platform admin (every row should be someone you recognise)
select id, email, created_at, updated_at from public.profiles where role = 'admin' order by updated_at desc;

-- users whose profile points at a business they are not a member of
select p.id, p.email, p.role, p.tenant_id, p.updated_at
from public.profiles p
left join public.tenant_memberships m on m.profile_id = p.id and m.tenant_id = p.tenant_id
where p.tenant_id is not null and m.profile_id is null and p.role::text <> 'customer'
order by p.updated_at desc;

-- businesses with more than one owner
select tenant_id, count(*) as owners, array_agg(profile_id) as profile_ids
from public.tenant_memberships where role = 'owner'
group by tenant_id having count(*) > 1;

-- applications marked approved that never got a business
select id, reference_code, status, reviewed_by, reviewed_at
from public.account_applications where status = 'approved' and tenant_id is null;

-- subscriptions that run unusually far ahead
select id, tenant_id, status, current_period_end
from public.subscriptions where current_period_end > now() + interval '13 months';
```

The admin activity log could be edited by anyone before this fix, so do not rely on it as proof either way.
If something looks wrong, keep a copy of the rows before changing them.

**5. Rotate if in doubt.** If step 4 shows anything unexpected, rotate the Supabase keys
(Dashboard → Project settings → API keys), update the hosting environment variables and redeploy, and reset the
passwords of affected accounts. The applicant data in `application_identities` may need to be treated as exposed
(Data Privacy Act): tell the project lead.

**6. Record the migration** so a later `supabase db push` does not run it again:

```bash
supabase link --project-ref <ref>
supabase migration list --remote      # compare local and hosted histories first
supabase migration repair --status applied 20261126140000 --remote
```

Older CLI versions use `--linked` instead of `--remote`. Migrations were recently renamed from numbers (`00001...`) to
timestamps. If the hosted history still lists the numbered versions, mark those `reverted` and the matching
timestamps `applied` before any `db push`.
