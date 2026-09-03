# Management desktop app

## Purpose

Dedicated desktop application (Tauri 2) for supervisors, managers, and authorized office staff to import/manage daily loading, monitor progress in real time, review trucks/bags/audit history, and export/print records.

This is **not** a web application, browser interface, or web dashboard.

## Design

See [../design-dna.md](../design-dna.md).

## Users

- Management

## Screens

TODO: define screen inventory when UI design begins

Expected areas (not final IA):

- Login
- Daily loading overview
- Loading list / import
- Truck list and truck detail (bags, seals, weights)
- Audit / modification history
- User/permission management (where applicable)
- Export/print

## Behaviors

Known from product knowledge:

- Operational overview answers “how many waiting/loading/completed/on hold?”
- Import Excel/CSV with preview/validation before create (format TBD)
- Real-time visibility of mobile changes via the shared database
- Authorized edits; important changes audited
- Truck total weight derived from bag weights

## Data

Desktop UI talks to Supabase with public credentials only (and Tauri native commands later if privileged work is required). See [../../ai/data-fetching.md](../../ai/data-fetching.md).

## Out of scope

- Public consumer marketing site
- Pixel-identical mobile clone
- QR scanning as a V1 requirement
- Hosting management in a browser

## Open questions

- Exact overview columns and filters
- Import spreadsheet mapping
- Permission matrix for edit vs view-only management users
- PDF layout requirements
- Default language and language-switch UX for Mandarin / English / French
