# Mobile loading app

## Purpose

Mobile surface for loading-floor personnel to find today’s trucks, verify bags quickly, record authorized changes, and complete trucks against the shared operational database.

## Design

See [../design-dna.md](../design-dna.md).

Platform-native patterns; same product language as web, not a visual clone.

## Users

- Loading / operational staff

## Screens

TODO: define screen inventory when UI design begins

Expected areas (not final IA):

- Login
- Today’s trucks
- Truck loading record
- Bag verification / modification
- Truck completion

## Behaviors

Known from product knowledge:

- Fast truck identification and bag verification (hundreds/day possible)
- Record verifier identity, timestamp, and values at verification
- Modifications preserve history (previous/new, who, when, reason when required)
- Controlled truck status transitions with audit
- Real-time sync with management
- QR/barcode truck open: future feature

## Data

Screen → UI/state → query/mutation layer → API/backend boundary. No privileged DB credentials on device.

## Out of scope

- Full offline-first mode in V1 (architecture must not forbid it later)
- Making mobile identical to web layout
- Public app-store consumer positioning

## Open questions

- Exact truck search/filter UX
- Which bag fields operators may edit
- Hold/cancel permissions for mobile users
- Offline conflict strategy (future)
