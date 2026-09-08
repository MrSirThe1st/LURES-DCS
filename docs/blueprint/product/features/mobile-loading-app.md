# Mobile loading app

## Purpose

Dedicated mobile application for loading-floor personnel to find today’s trucks, verify bags quickly, record authorized changes, and complete trucks against the shared operational database.

## Design

See [../design-dna.md](../design-dna.md).

Platform-native patterns; same product language as the desktop app, not a visual clone.

## Users

- Loading / operational staff

## Screens

Implemented (V1 slice):

- Login (loading staff only)
- Today’s trucks
- Truck loading record + complete truck
- Bag verification / modification with required reason on changes

Still TODO:

- Hold/cancel flows
- Offline mode
- QR/barcode truck open

## Behaviors

Known from product knowledge:

- Fast truck identification and bag verification (hundreds/day possible)
- Record verifier identity, timestamp, and values at verification
- Modifications preserve history (previous/new, who, when, reason when required)
- Trucks are read-only on mobile until management marks **Available**
- Controlled truck status transitions with audit (`available → loading` on first bag verify/edit; complete only from `loading`)
- Real-time sync with the desktop management application through Supabase
- QR/barcode truck open: future feature

## Data

Screen → UI/state → query/mutation layer → API/backend boundary. No privileged DB credentials on device.

## Out of scope

- Full offline-first mode in V1 (architecture must not forbid it later)
- Making mobile identical to the desktop layout
- Public app-store consumer positioning

## Open questions

- Exact truck search/filter UX
- Which bag fields operators may edit
- Hold/cancel permissions for mobile users
- Offline conflict strategy (future)
- Default language and language-switch UX for Mandarin / English / French
