# Authentication setup

**Provider:** Supabase Auth

## Desktop authentication (`apps/desktop`)

- Use the Supabase JS client only with the **publishable** key (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`)
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

Public / client-safe (in root `.env.local`):

- `VITE_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Privileged (never ship to desktop UI or mobile):

- `SUPABASE_SECRET_KEY` (`sb_secret_...` — replaces the legacy service-role key)
- Other secrets as introduced

See repo root `.env.local` (gitignored).

## Local development

Root `.env.local` must contain:

- `VITE_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` (bootstrap / privileged tooling only)

Bootstrap first users after the core schema migration:

```bash
node --env-file=.env.local scripts/bootstrap-dev-users.mjs
```

## First-admin / bootstrap

The first Management profile is created by the bootstrap script using the secret key (RLS chicken-and-egg). Later Management users can be created through authorized app flows once implemented.

Never commit real passwords, tokens, or secret keys.
