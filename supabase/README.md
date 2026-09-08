# Supabase

Remote project is connected via root `.env.local` (gitignored).

## Migrations

Versioned SQL lives in `migrations/`.

Applied foundation migration:

- `20260904000000_core_operational_schema.sql`

Creates:

- `profiles`
- `loading_lists`
- `trucks`
- `bags`
- `audit_events`
- `truck_weight_totals` (view)
- RLS policies
- Realtime publication for operational tables

Apply (or re-apply idempotent parts) with:

```bash
set -a && source .env.local && set +a
psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20260904000000_core_operational_schema.sql
```

## Bootstrap first users

```bash
node --env-file=.env.local scripts/bootstrap-dev-users.mjs
```

Creates temporary Management + Loading Auth users and matching `profiles` rows.
Change the default passwords immediately.

## Schema rules

Do not invent product tables outside `docs/blueprint` and `PROJECT_KNOWLEDGE.md`.
