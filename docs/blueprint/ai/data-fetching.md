# Web data fetching

Applies to the management web app at `apps/web` (Next.js App Router).

## Architecture overview

```
Navigation
  → Server Component page
  → session/auth helper
  → page-specific server use-case
  → repository/data access
  → serializable props
  → client UI where interaction is required
```

Mutations:

```
Client
  → API route / server action
  → validation (Zod)
  → authentication
  → authorization
  → use-case
  → repository
  → refresh/revalidation
```

## Data ownership

- PostgreSQL via Supabase is the source of truth
- Web UI never holds a privileged service-role client
- Prefer loading only the projection needed for the current screen

## Authentication resolution

- Resolve session on the server before protected data access
- TODO: document exact helper paths when auth helpers are finalized
- Never trust client-asserted identity or role

## Authorization

- Enforce on the server and via Supabase RLS
- Role checks belong in use-cases / policies, not only in UI conditionals

## Repository / use-case responsibilities

| Layer | Responsibility |
|-------|----------------|
| Use-case | Authz + domain rules for one action/screen |
| Repository / data-access | Narrow DB queries; no UI concerns |
| UI | Render and collect input; no privileged DB access |

Prefer page-specific use-cases over generic “god” repositories.

## Loading states

- Prefer server-rendered data for initial views
- Use client loading UI for interactive/realtime segments only when needed
- TODO: add shared loading patterns when first screens are implemented

## API boundaries

- Validate inputs with Zod (`packages/api-contracts` when shared)
- Return typed, serializable results
- Do not leak internal DB row shapes when a DTO is more appropriate

## Mutation flow

1. Validate
2. Authenticate
3. Authorize
4. Apply domain rules
5. Persist
6. Revalidate/refresh affected views
7. Emit audit events when the operation is auditable (product requirement)

## Database access

- Server-only privileged access through `packages/data-access` (or equivalent server modules)
- Generated DB types preferred over hand-duplicated schemas
- Migrations live under `supabase/migrations/`

## Caching / revalidation

- Use Next.js cache/revalidation primitives where they fit the App Router model
- For realtime operational visibility, prefer Supabase Realtime over aggressive polling
- TODO: define cache tags/revalidation map when first screens ship

## Common anti-patterns

- Making every page a Client Component
- Client-side fetch for static/initial dashboard data that could be server-loaded
- Loading full truck+bag+history graphs when a list row needs three fields
- Scattering raw Supabase calls across UI components
- Trusting role fields from the client

## PR checklist

- [ ] Server Component by default unless client behavior is required
- [ ] Auth checked before protected data
- [ ] Authorization not UI-only
- [ ] Zod validation at the boundary
- [ ] Query is narrow
- [ ] No service-role key on the client

## Reference implementation paths

TODO: add reference implementation path when available
