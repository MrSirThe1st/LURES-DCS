# LURES-DCS — Truck Loading & Dispatch Control System

Internal operational system for centralized truck loading and dispatch control.

## Documentation

- Product knowledge: [`PROJECT_KNOWLEDGE.md`](./PROJECT_KNOWLEDGE.md)
- Blueprint: [`docs/blueprint/README.md`](./docs/blueprint/README.md)
- Setup: [`docs/setup/auth.md`](./docs/setup/auth.md), [`docs/setup/database.md`](./docs/setup/database.md)

## Stack (foundation)

- pnpm workspaces + Turborepo + TypeScript
- `apps/web` — Next.js (App Router) management app
- `apps/mobile` — Expo React Native loading app
- Supabase — PostgreSQL, Auth, Realtime, Storage
- Shared packages — design-tokens, domain, api-contracts, data-access, ui, config, utils

## Getting started

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Copy `.env.example` to local env files and fill placeholders. Never commit secrets.

## Market and languages

- **Location:** DRC only
- **Languages:** Mandarin, English, and French

## Design tokens

`docs/blueprint/product/design-dna.md` → `packages/design-tokens` → web Tailwind / mobile theme.
