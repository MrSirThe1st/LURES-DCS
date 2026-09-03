# Database setup

**Technology:** PostgreSQL via Supabase

## Connection approach

| Use | Variable (name only) | Notes |
|-----|----------------------|-------|
| App runtime | Supabase client URL + anon key | Desktop (`VITE_*`) and mobile (`EXPO_PUBLIC_*`) |
| Direct / migrations | `DIRECT_URL` or Supabase direct DB URL | Use for migrations when pooler is unsuitable |
| Privileged tooling | `SUPABASE_SERVICE_ROLE_KEY` | Never in desktop UI or mobile |

Never commit URLs that embed credentials. Use placeholders such as `{{DATABASE_URL}}`.

## Environment variables

Documented in `.env.example`:

- `VITE_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (privileged only)
- `DATABASE_URL` (if used by tooling)
- `DIRECT_URL` (if used by migrations)

## Migration location

Versioned SQL migrations live in:

```text
supabase/migrations/
```

Do not modify production schema manually when a migration should represent the change.

## Local development

TODO: document local Supabase CLI workflow for this repository  
TODO: document how generated database types are produced and where they are committed

## Production migration guidance

- Apply migrations through the controlled Supabase/CI workflow once CI exists
- Review RLS policies with every table that stores operational data
- Prefer generated types after schema changes

Do not invent a full CI/CD architecture here.

## Pooler vs direct

- App queries: Supabase client (pooler as configured by the project)
- Migrations/DDL: direct connection when required by the migration tool

TODO: finalize exact connection strings/policy for the chosen host

## Seed strategy

TODO: define non-secret seed strategy for local/dev  
Never document real credentials as seed accounts.

## Backup / restore

TODO: define backup/restore expectations for operational data
