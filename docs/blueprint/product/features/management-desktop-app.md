# Management desktop app

## Purpose

Dedicated desktop application (Tauri 2) for supervisors, managers, and authorized office staff to import/manage daily loading, monitor progress in real time, review trucks/bags/audit history, and export/print records.

This is **not** a web application, browser interface, or web dashboard.

## Design

See [../design-dna.md](../design-dna.md).

## Users

- Management

## Screens

Implemented (V1 slice):

- Login
- Top navigation (no sidebar): Loading, Reports, History, Settings; right-side Upload / Export / Send / Settings icons
- Today’s loading overview (status counts + truck table; select one/several/all for status actions)
- Per-truck load progress bar (partial green while Loading; RYG outcome only when Completed — green = all verified, yellow = mods, red = completed with pending)
- Truck detail rendered as a digital **liste de colisage** (company letterhead, truck fields, bag table + TOTAL, beneficiary / signature lines); audit toggle on the detail page
- Realtime refresh for trucks/bags/audit (Live indicator; no manual refresh required)
- Bulk management status actions from Loading: **Available / Hold / Cancel** only (intersection of allowed actions; reason required for hold/cancel). Management does not set Loading or Completed.
- Packing-list import: multi-file liste de colisage (.xlsx/.csv), preview/validation, Append or Replace
- Stub pages for Reports, History, and Settings (sign out lives under Settings)

Still TODO:

- Bulletin de pesage import / cross-check
- Reports / analytics content
- Full audit history views
- User/permission management
- Export / Send

## Behaviors

Known from product knowledge:

- Operational overview answers waiting / available / loading / completed / on hold / cancelled counts
- Import Excel/CSV listes de colisage with preview/validation before write (see [../../../setup/import-format.md](../../../setup/import-format.md)); imported trucks start **Waiting**
- Management releases trucks with **Available** before floor work
- Append adds trucks (rejects duplicates); Replace clears that day’s active list trucks first
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
- Final company Excel export layout vs provisional import template
- Permission matrix for edit vs view-only management users
- PDF layout requirements
- Default language and language-switch UX for Mandarin / English / French
