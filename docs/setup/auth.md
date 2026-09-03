# Authentication setup

**Provider:** Supabase Auth

## Web authentication (`apps/web`)

- Use the Supabase browser client only with the **anon/public** key
- Resolve sessions on the server for protected App Router pages
- Centralize helpers; do not scatter raw auth calls

TODO: document exact helper file paths when implemented  
TODO: protected route redirect map for management UI

## Mobile authentication (`apps/mobile`)

- Expo app uses Supabase mobile/JS client with public credentials only
- Persist session securely per Expo/Supabase guidance

TODO: document session storage approach when implemented  
TODO: deep-link / auth callback configuration

## Session resolution

```
Request/screen
  → centralized session helper
  → authenticated user identity
  → authorization checks (server/RLS)
```

Never trust client-supplied role fields as authority.

## Protected routes

TODO: define route groups and redirect rules per surface

## Authorization / role checks

Conceptual roles:

- Management
- Loading / operational staff

Permission matrix: **TODO: define access scope**

Enforce with:

1. Server-side checks in use-cases / route handlers
2. Supabase Row Level Security policies

## Redirect rules

TODO: define unauthenticated → login and unauthorized → safe fallback per app

## Environment variables

Public / client-safe:

- `NEXT_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_URL` → `{{AUTH_PROJECT_URL}}`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Server-only:

- `SUPABASE_SERVICE_ROLE_KEY` (never ship to web or mobile clients)
- Other server secrets as introduced

See repo root `.env.example`.

## Local development

TODO: document `supabase start` / linked project steps for this repo  
TODO: first-admin bootstrap process (`{{ADMIN_EMAIL}}` / `{{ADMIN_PASSWORD}}` placeholders only)

## First-admin / bootstrap

TODO: define how the first Management user is created (invite, seed script, dashboard)

Never commit real passwords, tokens, or service-role keys.
