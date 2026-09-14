# LURES-DCS — Truck Loading & Dispatch Control System

Internal operational system for centralized truck loading and dispatch control.

## Documentation

- Product knowledge: [`PROJECT_KNOWLEDGE.md`](./PROJECT_KNOWLEDGE.md)
- Blueprint: [`docs/blueprint/README.md`](./docs/blueprint/README.md)
- Setup: [`docs/setup/auth.md`](./docs/setup/auth.md), [`docs/setup/database.md`](./docs/setup/database.md), [`docs/setup/import-format.md`](./docs/setup/import-format.md)

## Applications

- `apps/desktop` — dedicated **Tauri 2** management application (office staff)
- `apps/mobile` — dedicated **Expo / React Native** app: loading floor (`loading_staff`) and yard (`yard_agent`: confirm expected / register unplanned)
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

Mobile login (loading staff): `loading@lures.local` / `ChangeMe-Loading-1`  
Mobile login (yard agent): `yard@lures.local` / `ChangeMe-Yard-1`

Local secrets live in root `.env.local` (gitignored). Never commit secrets.

Bootstrap first Management / Loading / Yard users after schema setup:

```bash
pnpm bootstrap:users
pnpm seed:today
```

Desktop UI only (Vite, no Tauri window):

```bash
pnpm --filter @lures-dcs/desktop dev:ui
```


## Market and languages

- **Location:** DRC only
- **Languages:** Mandarin, English, and French (default UI: French — see [ADR-002](./docs/blueprint/decisions/ADR-002.md))

## Design tokens

`docs/blueprint/product/design-dna.md` → `packages/design-tokens` → desktop Tailwind / mobile theme.
