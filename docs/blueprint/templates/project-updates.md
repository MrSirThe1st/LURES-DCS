# Project updates

Lightweight, append-only project memory.

- Record **meaningful** changes (behavior, schema, contracts, architecture, docs that agents must know)
- Do **not** record every trivial implementation detail
- Entries must be factual
- Deferred tests should include a reason

Format:

```md
## YYYY-MM-DD
- Type: DB | API | Frontend | Mobile | Infra | Docs | Other
- Description: what changed
- Impact: tables, routes, contracts, folders, or behavior affected
- Tests: added | updated | passed | deferred (reason)
```

## 2026-09-03

- Type: Docs
- Description: Initial project blueprint created
- Impact: Added project product, AI, setup, and architecture documentation
- Tests: N/A

## 2026-09-03

- Type: Infra
- Description: Established monorepo technical foundation (pnpm/Turborepo, web/mobile shells, shared packages, design tokens, Supabase migration stub)
- Impact: `apps/web`, `apps/mobile`, `packages/*`, `supabase/`, root tooling, ADR-001, design-dna/token hierarchy, setup auth/database docs
- Tests: passed (`pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm --filter @lures-dcs/web build`)

## 2026-09-03

- Type: Docs
- Description: Confirmed market and languages — DRC only; Mandarin, English, and French
- Impact: Updated overview, brand, glossary, agent rules, roles/flows, feature open questions, ADR-001, PROJECT_KNOWLEDGE, README
- Tests: N/A

## 2026-09-04

- Type: Frontend
- Description: Enforced controlled truck status transitions with shared helper, desktop status actions, mobile complete gating, and required reasons for hold/cancel
- Impact: `packages/domain`, `packages/data-access/src/truck-status.ts`, desktop truck detail, mobile truck/operations
- Tests: passed (domain unit tests, desktop/mobile typecheck, status transition smoke test)

## 2026-09-11

- Type: Docs
- Description: Phase 0 V1 decision lock (ADR-002) — permission matrix, export/print PDF, Send = OS mail/share, default locale `fr`, lean Reports, History scope, mobile hold/cancel deferred, bulletin deferred, QR out of plan
- Impact: `docs/blueprint/decisions/ADR-002.md`, roles-and-flows, overview, brand, feature docs, auth/import setup, PROJECT_KNOWLEDGE §17/§29, blueprint README
- Tests: N/A (documentation only)


## 2026-09-11

- Type: Frontend | API | Docs
- Description: Phase 1 Export/print — packing-list PDF from selected/open trucks, download+print, `exported` audit events
- Impact: `packages/api-contracts/src/export.ts`, `packages/data-access/src/export-trucks.ts`, `apps/desktop/src/lib/{packing-list-pdf,save-pdf,export-packing-list}.ts`, `App.tsx`, TodayOverview selection lift, feature/setup docs
- Tests: passed (`api-contracts` export unit tests; desktop/data-access/api-contracts typecheck)

## 2026-09-11

- Type: Frontend | API | Docs
- Description: Phase 2 History — past loading days with truck drill-in and filterable audit log
- Impact: `packages/data-access/src/history.ts`, `apps/desktop/src/screens/HistoryScreen.tsx`, App truck return navigation (`from` page), feature docs
- Tests: passed (data-access + desktop typecheck)

## 2026-09-11

- Type: Mobile | Domain | Docs
- Description: Phase 4 closed as deferred — mobile Hold/Cancel remain management-only; added `canMobileTransitionTruckStatus` / `assertMobileTruckStatusTransition` and removed open mobile `setTruckStatus` helper
- Impact: `packages/domain`, `apps/mobile/lib/operations.ts`, ADR-002, mobile feature + roles docs
- Tests: passed (domain unit tests; mobile typecheck)

## 2026-09-11

- Type: Frontend | Mobile | Docs
- Description: Phase 5 i18n — shared `@lures-dcs/i18n` catalogs (fr default, en, zh), Settings language switchers, persist `profiles.preferred_locale`
- Impact: `packages/i18n`, desktop LocaleProvider/TopNav/Settings/Login/History/Reports, mobile LocaleProvider/Settings/login/index/truck
- Tests: passed (i18n unit tests; desktop/mobile/domain typecheck)
