# Management web app

## Purpose

Desktop web surface for supervisors, managers, and authorized office staff to import/manage daily loading, monitor progress in real time, review trucks/bags/audit history, and export/print records.

## Design

See [../design-dna.md](../design-dna.md).

## Users

- Management

## Screens

TODO: define screen inventory when UI design begins

Expected areas (not final IA):

- Login
- Daily loading dashboard
- Loading list / import
- Truck list and truck detail (bags, seals, weights)
- Audit / modification history
- Export/print

## Behaviors

Known from product knowledge:

- Operational dashboard answers “how many waiting/loading/completed/on hold?”
- Import Excel/CSV with preview/validation before create (format TBD)
- Real-time visibility of mobile changes
- Authorized edits; important changes audited
- Truck total weight derived from bag weights

## Data

Server-first App Router loading. See [../../ai/data-fetching.md](../../ai/data-fetching.md).

## Out of scope

- Public consumer marketing site
- Pixel-identical mobile clone
- QR scanning as a V1 requirement

## Open questions

- Exact dashboard columns and filters
- Import spreadsheet mapping
- Permission matrix for edit vs view-only management users
- PDF layout requirements
