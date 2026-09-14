# Database setup

**Technology:** PostgreSQL via Supabase

## Connection approach

| Use | Variable (name only) | Notes |
|-----|----------------------|-------|
| App runtime | Supabase URL + publishable key | Desktop (`VITE_*`) and mobile (`EXPO_PUBLIC_*`) |
| Transaction pooler | `DATABASE_URL` | Port `6543` — runtime / pooled queries |
| Session / migrations | `DIRECT_URL` | Port `5432` session pooler when transaction mode is unsuitable |
| Privileged tooling | `SUPABASE_SECRET_KEY` | Never in desktop UI or mobile |

Never commit URLs that embed credentials.

## Environment variables

Live in root `.env.local` (gitignored):

- `VITE_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` (privileged only)
- `DATABASE_URL` (transaction pooler)
- `DIRECT_URL` (session pooler / migrations)

## Migration location

Versioned SQL migrations live in:

```text
supabase/migrations/
```

Do not modify production schema manually when a migration should represent the change.

## Local development

Root `.env.local` holds project URL, publishable key, secret key, and pooler URLs.

Apply migrations with `psql` against `DIRECT_URL` (session pooler).

Bootstrap first Management / Loading users:

```bash
node --env-file=.env.local scripts/bootstrap-dev-users.mjs
```

TODO: document generated-type workflow when Docker/`supabase gen types` is available locally.

## Production migration guidance

- Apply migrations through the controlled Supabase/CI workflow once CI exists
- Review RLS policies with every table that stores operational data
- Prefer generated types after schema changes

Do not invent a full CI/CD architecture here.

## Pooler vs direct

- App queries: Supabase client (pooler as configured by the project)
- Migrations/DDL: direct connection when required by the migration tool

TODO: finalize exact connection strings/policy for the chosen host

## Schema notes (pre-alerts / yard)

- `pre_alerts` + `pre_alert_lines` hold Loading Orders. Import creates **expected** trips. Pause (`paused`) keeps those trips in the yard as read-only. Delete removes the order from Pre-alerts and those expected / did-not-arrive trucks from the yard (trip rows stay for audit; blocked if any arrived trip is still open). `closed` is historical; leftover expected trucks were marked `did_not_arrive`.
- `vehicles` is physical identity; `trucks` is an operational trip with source-spelling snapshots.
- `trucks.field_sources` records provenance (`pre_alert` | `yard` | `bp` | `packing_list` | `manual`). Yard-sourced fields must not be silently overwritten.
- `external_persons` is the extensible client-checker model (no login role yet).
- `organization_name_aliases` is optional later linking — **not** used for matching. Match by normalized horse registration.
- `trucks.loading_list_id` nullable: null means not yet on a Loading Program / BP (or program date bridge).
- `loading_lists.bulletin_number` is the BP identity (renamed from `packing_list_number`). `program_code` is informal (e.g. BP049). Unique when not null. Assign-to-date bridge lists keep `bulletin_number` null.
- Open-plate uniqueness: `arrival_status` in (`expected`, `arrived`) and floor status not completed/cancelled.
- Arrival order (`arrived_at`), BP order (`program_sequence`), loading order (`loading_started_at`) are independent.
- Role `yard_agent` confirms expected arrivals and may register unplanned; management assigns program dates on desktop and imports Loading Program / BP on Loading.

## Seed strategy

TODO: define non-secret seed strategy for local/dev  
Never document real credentials as seed accounts.

## Backup / restore

TODO: define backup/restore expectations for operational data
