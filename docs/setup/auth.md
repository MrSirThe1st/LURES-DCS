# Authentication setup

**Provider:** Supabase Auth

## Desktop authentication (`apps/desktop`)

- Use the Supabase JS client only with the **anon/public** key (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- Persist session inside the desktop application, not in a browser product
- Centralize helpers; do not scatter raw auth calls

TODO: document exact helper file paths when implemented  
TODO: protected screen map for the management UI

## Mobile authentication (`apps/mobile`)

- Expo app uses Supabase mobile/JS client with public credentials only
- Persist session securely per Expo/Supabase guidance

TODO: document session storage approach when implemented  
TODO: deep-link / auth callback configuration

## Session resolution

```
Screen
  → centralized session helper
  → authenticated user identity
  → authorization checks (RLS / trusted use-cases)
```

Never trust client-supplied role fields as authority.

## Protected routes

TODO: define screen groups and redirect rules per application

## Authorization / role checks

Conceptual roles:

- Management
- Loading / operational staff

Permission matrix: **TODO: define access scope**

Enforce with:

1. Trusted checks in use-cases
2. Supabase Row Level Security policies

## Redirect rules

TODO: define unauthenticated → login and unauthorized → safe fallback per app

## Environment variables

Public / client-safe:

- `VITE_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_URL` → `{{AUTH_PROJECT_URL}}`
- `VITE_SUPABASE_ANON_KEY` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Privileged (never ship to desktop UI or mobile):

- `SUPABASE_SERVICE_ROLE_KEY`
- Other secrets as introduced

See repo root `.env.example`.

## Local development

TODO: document `supabase start` / linked project steps for this repo  
TODO: first-admin bootstrap process (`{{ADMIN_EMAIL}}` / `{{ADMIN_PASSWORD}}` placeholders only)

## First-admin / bootstrap

TODO: define how the first Management user is created (invite, seed script, dashboard)

Never commit real passwords, tokens, or service-role keys.
