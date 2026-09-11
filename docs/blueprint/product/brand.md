# Brand

## Product name

**Truck Loading & Dispatch Control System** (project code: **LURES-DCS**)

## Market

**DRC only** — internal company system for use in the Democratic Republic of the Congo. Not a public consumer brand.

## Positioning

TODO: define brand positioning when known

Internal operational tool emphasizing reliability, auditability, and real-time loading visibility — not decorative analytics.

## Voice and tone

TODO: define formal brand voice when known

Interim guidance (product docs only):

- Clear, operational, and precise
- Prefer plain language over marketing copy
- Prefer status and facts over slogans

## Languages

The product must support **three languages**:

1. Mandarin
2. English
3. French

## Plain-language rules

- Provide UI and operational copy in Mandarin, English, and French
- Do not invent translated labels until copy is confirmed per language
- Keep domain terms consistent with [glossary.md](./glossary.md) across languages
- Prefer plain language over marketing copy in every locale

**Default language:** French (`fr`) — locked in [ADR-002](../decisions/ADR-002.md); implemented via `@lures-dcs/i18n`.  
**Switch UX:** Settings control on desktop and mobile; persist to `profiles.preferred_locale`.  
**Translation workflow:** shared message catalogs in `packages/i18n`; prefer glossary-confirmed terms; interim UI may mirror existing English operational wording until terminology lists are signed off.

TODO: confirm approved terminology lists for Mandarin, English, and French
## Naming conventions

| Context | Convention |
|---------|------------|
| Product | Truck Loading & Dispatch Control System / LURES-DCS |
| Packages | `@lures-dcs/*` |
| Apps | `apps/desktop`, `apps/mobile` |
| Domain terms | Prefer glossary names; avoid synonym drift |

## UX writing principles

- One primary action per operational step
- Status words must match documented truck/bag states
- Errors must be actionable and non-technical where possible
- Do not invent field labels that contradict company documents

TODO: create approved microcopy list when first screens are designed
