# Truck Loading & Dispatch Control System Blueprint

This directory is the project’s **product memory**, **AI operating rules**, **feature context**, **architecture decisions**, and pointers to **setup guidance**.

Agents should use **progressive disclosure**: do not read every document for every task.

## Required read order

1. [product/overview.md](./product/overview.md)
2. [product/roles-and-flows.md](./product/roles-and-flows.md)
3. [product/glossary.md](./product/glossary.md)
4. Relevant feature documentation under [product/features/](./product/features/)
5. [ai/AGENT_RULES.md](./ai/AGENT_RULES.md)
6. [ai/data-fetching.md](./ai/data-fetching.md) when working on desktop or mobile data loading
7. [ai/ui-verification.md](./ai/ui-verification.md) when working on UI
8. [templates/project-updates.md](./templates/project-updates.md) when recording changes
9. Relevant ADRs under [decisions/](./decisions/) when changing architecture

Also see setup docs:

- [../setup/auth.md](../setup/auth.md)
- [../setup/database.md](../setup/database.md)

Root product knowledge (vision and requirements): [../../PROJECT_KNOWLEDGE.md](../../PROJECT_KNOWLEDGE.md)

## Documentation index

### Product

| Document | Purpose |
|----------|---------|
| [product/overview.md](./product/overview.md) | What the product is, surfaces, roles, MVP boundaries |
| [product/brand.md](./product/brand.md) | Brand/voice placeholders and naming |
| [product/design-dna.md](./product/design-dna.md) | Design language intent and token hierarchy |
| [product/roles-and-flows.md](./product/roles-and-flows.md) | Roles and core journeys |
| [product/glossary.md](./product/glossary.md) | Domain terminology |
| [product/features/management-desktop-app.md](./product/features/management-desktop-app.md) | Management desktop surface |
| [product/features/mobile-loading-app.md](./product/features/mobile-loading-app.md) | Mobile loading surface |

### AI

| Document | Purpose |
|----------|---------|
| [ai/AGENT_RULES.md](./ai/AGENT_RULES.md) | Operating rules for coding agents |
| [ai/data-fetching.md](./ai/data-fetching.md) | Shared-backend data architecture for both apps |
| [ai/ui-verification.md](./ai/ui-verification.md) | UI verification approach |

### Architecture decisions

| Document | Purpose |
|----------|---------|
| [decisions/ADR-001.md](./decisions/ADR-001.md) | Application boundaries and foundation stack |
| [decisions/ADR-002.md](./decisions/ADR-002.md) | Phase 0 V1 decision lock (permissions, export, send, i18n, reports, deferrals) |

### Setup

| Document | Purpose |
|----------|---------|
| [../setup/auth.md](../setup/auth.md) | Supabase Auth setup |
| [../setup/database.md](../setup/database.md) | PostgreSQL / Supabase database setup |

### Templates

| Document | Purpose |
|----------|---------|
| [templates/project-updates.md](./templates/project-updates.md) | Append-only project memory |
