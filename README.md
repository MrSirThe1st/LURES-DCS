# LURES-DCS — Truck Loading & Dispatch Control System

Internal operational system for centralized truck loading and dispatch control.

## Documentation

- Product knowledge: [`PROJECT_KNOWLEDGE.md`](./PROJECT_KNOWLEDGE.md)
- Blueprint: [`docs/blueprint/README.md`](./docs/blueprint/README.md)
- Setup: [`docs/setup/auth.md`](./docs/setup/auth.md), [`docs/setup/database.md`](./docs/setup/database.md)

## Applications

- `apps/desktop` — dedicated **Tauri 2** management application (office staff)
- `apps/mobile` — dedicated **Expo / React Native** loading-operations application
- Supabase — PostgreSQL, Auth, Realtime, Storage (shared backend)
- Shared TypeScript libraries under `packages/` — design-tokens, domain, api-contracts, data-access, ui, config, utils

The repository holds both applications and shared libraries so domain types can stay consistent. That is repository organization, not a product requirement to treat this as a “monorepo architecture.”

## Getting started

Prerequisites: Node 20+, pnpm, and a Rust toolchain (`rustup`) for the desktop shell.

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Desktop window (requires Rust):

```bash
pnpm --filter @lures-dcs/desktop dev
```

Mobile:

```bash
pnpm --filter @lures-dcs/mobile dev
```

Copy `.env.example` to local env files and fill placeholders. Never commit secrets.

## Market and languages

- **Location:** DRC only
- **Languages:** Mandarin, English, and French

## Design tokens

`docs/blueprint/product/design-dna.md` → `packages/design-tokens` → desktop Tailwind / mobile theme.
