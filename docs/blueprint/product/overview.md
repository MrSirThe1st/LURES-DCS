# Product overview

## What it is

Centralized digital truck loading and dispatch control so operational loading data — not paper — is the source of truth for mineral/concentrate truck loading in the DRC.

## Problem

Paper packing/loading lists create transcription errors, weak auditability, lost documents, and no real-time management visibility across busy loading days with many trucks and hundreds of bag verifications.

## Solution

Two authenticated company surfaces share one Supabase-backed operational database:

- Management monitors and administers daily loading
- Mobile loading staff verify bags and record authorized changes in the field

Generated PDF/paper documents are outputs of structured data, not the primary store.

## Market and locale

| Parameter | Value |
|-----------|-------|
| Market / region | **DRC only** — the system is for use in the Democratic Republic of the Congo |
| Languages | **Mandarin**, **English**, and **French** (all three required) |
| Currency | TODO: define when known |

## Surfaces

| Surface | Path | Notes |
|---------|------|-------|
| Management web app | `apps/web` | Desktop browser for supervisors/office staff |
| Mobile loading app | `apps/mobile` | Expo app for loading-floor operators |

## Roles

| Role | Description |
|------|-------------|
| Management | Supervisors, managers, authorized office/administrative personnel |
| Loading / operational staff | Personnel physically checking/loading trucks |

Exact permission matrix: **TODO: define access scope**

## MVP scope

### In scope

- Authentication
- Daily loading dashboard and truck/bag operational records
- Import truck/loading data (Excel/CSV) once format is confirmed
- Truck status and bag verification
- Authorized edits with modification reasons where required
- Real-time monitoring between surfaces
- Audit history
- Export/print of final records

### Out of scope (for V1 unless explicitly promoted)

- QR/barcode scanning
- OCR from packing-list PDFs/images
- Offline-first mobile mode
- Weight-scale integration
- Public consumer app distribution
- Analytics/monitoring products not yet required

### TBD

- Exact import spreadsheet mapping
- Final field list and approved copy in Mandarin, English, and French
- Role/permission matrix
- Production brand palette and typography
- PDF layout fidelity to paper forms
- Default UI language and language-switch behavior

## Success metrics

TODO: define operational success metrics with stakeholders

## Related documentation

- [roles-and-flows.md](./roles-and-flows.md)
- [glossary.md](./glossary.md)
- [brand.md](./brand.md)
- [design-dna.md](./design-dna.md)
- [features/management-web-app.md](./features/management-web-app.md)
- [features/mobile-loading-app.md](./features/mobile-loading-app.md)
- [../../../PROJECT_KNOWLEDGE.md](../../../PROJECT_KNOWLEDGE.md)
