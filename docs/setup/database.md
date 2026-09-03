# Database setup

**Technology:** PostgreSQL via Supabase

## Connection approach

| Use | Variable (name only) | Notes |
|-----|----------------------|-------|
| App runtime (pooled) | `DATABASE_URL` / Supabase client URL | Prefer pooler for serverless/web runtime when applicable |
| Direct / migrations | `DIRECT_URL` or Supabase direct DB URL | Use for migrations when pooler is unsuitable |
| Supabase API | `NEXT_PUBLIC_SUPABASE_URL` + keys | See [auth.md](./auth.md) |

Never commit URLs that embed credentials. Use placeholders such as `{{DATABASE_URL}}`.

## Environment variables

Documented in `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
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

- Apply migrations through the controlled Supabase/CI workflow
- Review RLS policies with every table that stores operational data
- Prefer generated types after schema changes

## Pooler vs direct

- Runtime/app queries: pooler-friendly connection when using serverless/edge-style hosting
- Migrations/DDL: direct connection when required by the migration tool

TODO: finalize exact connection strings/policy for the chosen host

## Seed strategy

TODO: define non-secret seed strategy for local/dev  
Never document real credentials as seed accounts.

## Backup / restore

TODO: define backup/restore expectations for operational data
