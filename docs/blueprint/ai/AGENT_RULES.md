# Agent rules

Concise operating manual for AI coding agents on this repository.

## 1. Product scope

**Purpose:** Centralized digital truck loading and dispatch control so operational loading data (not paper) is the source of truth.

| Surface | Users | Purpose |
|---------|-------|---------|
| Management desktop app (`apps/desktop`) | Management | Pre-alerts, yard (expected/arrived), assign to program date, import packing lists, monitor trucks/bags, audit, export/print |
| Mobile app (`apps/mobile`) | Loading staff and yard agent | Floor: today’s trucks, bag verify, complete. Yard: confirm expected arrivals, register unplanned, view FIFO queue |

**Market:** DRC only.  
**Languages:** Mandarin, English, and French (all required). Default UI language: French (`fr`) — see [ADR-002](../decisions/ADR-002.md).

**Core entities (conceptual):** User, External person, Vehicle, Pre-alert / Loading Order, Loading Program / BP, Truck (trip), Bag, Driver, Transporter, Audit Event, Attachment/Document.

Do **not** work outside this product scope. Do not invent entities, roles, workflows, or permissions that are not documented in `docs/` or `PROJECT_KNOWLEDGE.md`. Do not drop or ignore a required language when implementing user-facing copy. Follow [ADR-002](../decisions/ADR-002.md) for V1 permission, export, send, i18n, and deferral locks.

Do **not** introduce a web/browser management client. Do not describe the product as requiring a monorepo architecture.

## 2. Before every task

1. Read [../templates/project-updates.md](../templates/project-updates.md) if recent changes matter.
2. Read [../product/overview.md](../product/overview.md).
3. Read the relevant feature doc under [../product/features/](../product/features/).
4. Read [../product/roles-and-flows.md](../product/roles-and-flows.md) when changing journeys.
5. Read [../product/glossary.md](../product/glossary.md) when changing terminology.
6. Read [../product/brand.md](../product/brand.md) and [../product/design-dna.md](../product/design-dna.md) for UI work.
7. Read [data-fetching.md](./data-fetching.md) for data/API architecture.
8. Inspect existing code before creating new abstractions.

**Ask before proceeding when:**

- authentication/security behavior is unclear
- a destructive database change is required
- a public API contract must change
- permissions or role boundaries are ambiguous
- a major architectural decision is required
- multiple materially different product interpretations exist
- the requested change conflicts with documented product behavior

Otherwise, choose the smallest reasonable implementation and document important assumptions.

## 3. Engineering standards

Stack: Tauri 2 desktop, Expo mobile (current starting point), Supabase (PostgreSQL + Auth + Realtime + Storage), TypeScript, Zod at boundaries.

- Prefer TypeScript strict mode; avoid `any` in non-trivial code
- Validate external input at system boundaries with Zod
- Authenticate protected operations
- Enforce authorization/role scope via RLS and trusted checks; never trust client-provided permissions
- Never expose privileged database/service credentials to the desktop UI bundle or mobile app
- Reuse existing domain types and UI components
- Avoid duplicate business logic
- Keep database queries narrow
- Preserve package boundaries from [../decisions/ADR-001.md](../decisions/ADR-001.md)

Do not impose framework-specific rules that do not apply to the file being edited.

## 4. Data access

- UI should request only the data it needs
- Prefer screen/use-case-specific data access
- Avoid unnecessary fan-out queries and full domain graphs
- Keep privileged data access out of renderer/mobile bundles (`packages/data-access` service client is not for UI)
- Reuse the same business use-case from both applications where appropriate
- Desktop: UI → query/mutation layer → Supabase (anon) / optional Tauri commands
- Mobile: screens → query/mutation layer → API/backend boundary; no privileged DB calls in UI

## 5. Workflow

1. Read relevant documentation
2. Inspect existing implementation
3. Identify the smallest implementation slice
4. Implement it
5. Run the smallest relevant checks
6. Fix failures
7. Run broader checks when warranted
8. Update documentation only when project knowledge changed
9. Record meaningful changes in [../templates/project-updates.md](../templates/project-updates.md)

## 6. Verification

Proportional verification:

| Change | Minimum verification |
|--------|----------------------|
| Copy/content | relevant lint/typecheck if applicable |
| UI component | lint + typecheck + relevant UI test |
| Business logic | unit tests + typecheck |
| API | validation/auth/error tests |
| Database | migration validation + affected tests |
| Auth/permissions | positive + unauthorized/forbidden tests |
| Architecture/config | full relevant build/test checks |

Before merge/PR, run the project’s complete required validation commands (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` as applicable).

## 7. Minimum test expectations

**New API behavior:** success; invalid input; unauthenticated when protected; unauthorized/forbidden when role-scoped.

**New business logic:** happy path; meaningful failure case.

**State/lifecycle transitions:** valid transition; invalid transition where relevant.

Do not create meaningless tests solely for coverage targets.

## 8. Delivery priority (MVP)

Based on documented purpose, roles, surfaces, and entities:

1. Auth for Management, Loading staff, and Yard agent
2. Daily loading list / truck / bag operational records (shared source of truth)
3. Desktop loading management + truck/bag review + audit visibility
4. Mobile today’s trucks + bag verification + authorized modifications + completion
5. Real-time sync between applications
6. Import (Excel/CSV) and export/print — after core operational loop works

Unknown priority details: **TODO: refine with stakeholders when required**

## 9. Documentation changes

Update docs when a change affects product behavior, domain terminology, roles, architecture, API contracts, authentication, database conventions, or major UI conventions.

Do not update documentation for every trivial code change.

## 10. Design system

Hierarchy:

`brand.md` → `design-dna.md` → `packages/design-tokens` → desktop Tailwind / mobile theme

Do not invent brand colors or fonts. Prefer semantic tokens. See [../product/design-dna.md](../product/design-dna.md).
