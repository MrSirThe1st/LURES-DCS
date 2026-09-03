# Data fetching

Applies to both applications: the management desktop app (`apps/desktop`) and the mobile loading app (`apps/mobile`).

PostgreSQL via Supabase is the source of truth. The two apps do not keep independent copies of truck/loading data.

## Architecture overview

```
Screen
  → session/auth helper
  → screen-specific use-case
  → repository / data-access (anon client)
  → UI
```

Realtime:

```
Write to Supabase
  → Realtime (or equivalent subscription)
  → Other application updates
```

Mutations:

```
Client
  → validation (Zod)
  → authentication
  → authorization (RLS + trusted checks)
  → use-case
  → persist
  → UI refresh / realtime
  → audit event when the operation is auditable
```

Privileged operations (if later required) must not live in the desktop UI bundle or the mobile app. Prefer RLS-backed user sessions. Tauri native commands are allowed later only as a trusted desktop-side boundary — do not invent that split until needed.

## Data ownership

- UI never holds a privileged service-role client
- Prefer loading only the projection needed for the current screen

## Authentication resolution

- Resolve session before protected data access
- TODO: document exact helper paths when auth helpers are finalized
- Never trust client-asserted identity or role

## Authorization

- Enforce via Supabase RLS and trusted use-case checks
- Role checks belong in use-cases / policies, not only in UI conditionals

## Repository / use-case responsibilities

| Layer | Responsibility |
|-------|----------------|
| Use-case | Authz + domain rules for one action/screen |
| Repository / data-access | Narrow DB queries; no UI concerns |
| UI | Render and collect input; no privileged DB access |

Prefer screen-specific use-cases over generic “god” repositories.

## Loading states

- Show clear pending/empty/error states in each application
- For operational visibility, prefer Supabase Realtime over aggressive polling
- TODO: add shared loading patterns when first screens are implemented

## API boundaries

- Validate inputs with Zod (`packages/api-contracts` when shared)
- Return typed, serializable results
- Do not leak internal DB row shapes when a DTO is more appropriate

## Common anti-patterns

- Loading full truck+bag+history graphs when a list row needs three fields
- Scattering raw Supabase calls across UI components
- Trusting role fields from the client
- Manual file exchange between desktop and mobile as the sync model
- Next.js / App Router server-component patterns (this product is not a web app)

## PR checklist

- [ ] Auth checked before protected data
- [ ] Authorization not UI-only
- [ ] Zod validation at the boundary
- [ ] Query is narrow
- [ ] No service-role key on desktop UI or mobile

## Reference implementation paths

TODO: add reference implementation path when available
