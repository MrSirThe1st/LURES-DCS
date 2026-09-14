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

## 2026-09-11

- Type: Docs
- Description: Phase 8 closed as deferred — bulletin de pesage import/cross-check stays out of V1 until stakeholder confirmation; schema hints may remain; no bulletin UX
- Impact: ADR-002, management feature, overview, roles, glossary, import-format
- Tests: N/A (documentation only)

## 2026-09-12

- Type: DB | API | Frontend | Docs
- Description: Yard arrival registry — trucks exist without a packing list; FIFO queue; assign to a program date; packing-list import attaches to existing plates; Available requires bags
- Impact: `trucks.loading_list_id` nullable; `arrived_at`, `driver_phone`, `client_name`; desktop Yard screen; Loading date picker + return to yard; import no longer deletes yard trucks on Replace
- Tests: added (domain plate normalize; api-contracts yard schemas)

- Type: DB | API | Frontend | Docs
- Description: Yard register moves to a phone `yard_agent` role (same Expo app); desktop Yard is queue + assign only
- Impact: `user_role` + `yard_agent`; RLS split; mobile yard queue/register; bootstrap `yard@lures.local`; ADR-002 three-role matrix
- Tests: typecheck

## 2026-09-13

- Type: DB | API | Frontend | Mobile | Docs
- Description: Phase 1 pre-alerts — Loading Order import creates expected trips; yard confirms or registers unplanned; close order keeps did-not-arrive history. Vehicle identity, field provenance, and source labels are preserved; matching is by horse plate, not transporter aliases. BP import remains Phase 2.
- Impact: `pre_alerts`, `pre_alert_lines`, `vehicles`, `external_persons`, `organization_name_aliases`; `trucks` arrival/provenance columns; desktop Pre-alerts + Yard; mobile search-to-confirm; ADR-002/glossary/roles
- Tests: added (Loading Order parse fixture; domain arrival/provenance helpers); typecheck

## 2026-09-13

- Type: DB | API | Frontend | Docs
- Description: Phase 2 Loading Program / BP — import company bulletin (sheet BP; skip 装/发/放), match open trips by horse plate, never silently overwrite yard-confirmed fields, optional create-unplanned for unmatched horses, Excel export clones company BP layout. `loading_lists.packing_list_number` renamed to `bulletin_number`. Assign-to-date stays a bridge for lists without a bulletin number.
- Impact: `loading_lists.bulletin_number` / `program_code`; desktop Loading import/export; packing-list Upload no longer takes a bulletin reference; ADR-002/glossary/import-format
- Tests: added (BP049 parse + export round-trip; domain BP conflict helper); typecheck

- Type: API | Frontend | Docs
- Description: Validated BP import/export against the original BP049 .xlsx. Excel date cells use the displayed `11-Sep-26` value (serial 46276 was shifting a day). Export layout follows the BP sheet (Chinese letterhead, column widths, merges, filename with 吨). Fixture `fixtures/import/bp049-lu-ex-conc.xlsx` is the layout reference; 装/发/放 sheets stay ignored.
- Impact: `bulletin-parse` cell date handling; `bulletin-export` layout; desktop BP sheet reader/export
- Tests: added (original xlsx BP sheet vs CSV fixture; Excel date serial)

- Type: API | Frontend | Docs
- Description: Validated packing-list Upload against the original BP049 colisage .xlsx. Import reads 装 sheets (not BP / 发 / 放). Combined `LIEU DE CHARGEMENT` cells and Excel date serials match the company file. Fixture `fixtures/import/bp049-lu-ex-colisage.xlsx`.
- Impact: `packingListSheetNames`; liste-de-colisage meta/date parse; desktop Upload multi-sheet reader
- Tests: added (original xlsx 26×装 vs parser; inline loading location; Excel date serial)

## 2026-09-13

- Type: DB | API | Frontend | Docs
- Description: Implausible Loading Order ETA TO MINE values stay stored as written unless management edits or clears them during import preview. Preview groups them under Requires review; original `eta_raw` is preserved; kept dates show a small warning on the Loading Order table.
- Impact: `pre_alert_lines.eta_review`; Loading Order import preview; audit `eta_reviewed`; import-format
- Tests: added (applyEtaReview keep/edit/clear; parse still does not auto-correct)

## 2026-09-13

- Type: DB | API | Frontend | Mobile | Docs
- Description: Loading Order close is replaced by pause (yard read-only, expected trucks stay) and delete (removes expected / did-not-arrive trucks from the yard; blocked if arrived trips are still open). Resume restores confirm. `pre_alert_status` gains `paused`; historical `closed` rows remain.
- Impact: `pre_alerts.status`; pause/resume/delete use-cases; desktop Pre-alerts + Yard; mobile yard confirm disabled while paused; ADR-002/glossary
- Tests: updated (`isPreAlertYardMutable`); typecheck

