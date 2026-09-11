# Product overview

## What it is

Centralized digital truck loading and dispatch control so operational loading data — not paper — is the source of truth for mineral/concentrate truck loading in the DRC.

## Problem

Paper packing/loading lists create transcription errors, weak auditability, lost documents, and no real-time management visibility across busy loading days with many trucks and hundreds of bag verifications.

## Solution

Two dedicated company applications share one Supabase-backed operational database:

- **Desktop (management)** monitors and administers daily loading
- **Mobile (loading operations)** verifies bags and records authorized changes in the field

Generated PDF/paper documents are outputs of structured data, not the primary store.

There is no separate copy of truck/loading data per application. The database is the single source of truth. Changes are not exchanged as files between apps.

## Market and locale

| Parameter | Value |
|-----------|-------|
| Market / region | **DRC only** — the system is for use in the Democratic Republic of the Congo |
| Languages | **Mandarin**, **English**, and **French** (all three required) |
| Currency | TODO: define when known |

## Surfaces

| Surface | Path | Notes |
|---------|------|-------|
| Management desktop app | `apps/desktop` | Dedicated Tauri 2 application for supervisors/office staff |
| Mobile loading app | `apps/mobile` | Dedicated Expo app for loading-floor operators |

Do not describe management as a web app, browser app, or web dashboard.

## Roles

| Role | Description |
|------|-------------|
| Management | Supervisors, managers, authorized office/administrative personnel |
| Loading / operational staff | Personnel physically checking/loading trucks |

Permission matrix: **locked** in [ADR-002](../decisions/ADR-002.md) and [roles-and-flows.md](./roles-and-flows.md).

## MVP scope

### In scope

- Authentication
- Daily loading management and truck/bag operational records
- Import/create loading lists (Excel/CSV) once format is confirmed
- Truck status and bag verification
- Authorized edits with modification reasons where required
- Real-time monitoring between applications
- Audit history / History screen
- Export/print of final records (PDF)
- Send via OS mail/share of PDF
- User management (management role)
- UI in Mandarin, English, and French (default French)
- Lean operational Reports (counts / throughput — not advanced analytics)

### Out of scope (for V1 unless explicitly promoted)

- QR/barcode scanning
- OCR from packing-list PDFs/images
- Offline-first mobile mode
- Weight-scale integration
- Public consumer app distribution
- A browser-hosted management application
- Advanced analytics / BI products
- Mobile Hold / Cancel (management-only in V1)
- Automated WhatsApp / email
- Bulletin de pesage import / cross-check (deferred until confirmed)

### TBD (does not block V1 decision lock)

- Exact import spreadsheet mapping refinements from live company exports
- Final field list and approved copy in Mandarin, English, and French
- Production brand palette and typography
- Pixel-level PDF fidelity to paper forms

## Success metrics

TODO: define operational success metrics with stakeholders

## Related documentation

- [roles-and-flows.md](./roles-and-flows.md)
- [glossary.md](./glossary.md)
- [brand.md](./brand.md)
- [design-dna.md](./design-dna.md)
- [features/management-desktop-app.md](./features/management-desktop-app.md)
- [features/mobile-loading-app.md](./features/mobile-loading-app.md)
- [../../../PROJECT_KNOWLEDGE.md](../../../PROJECT_KNOWLEDGE.md)
