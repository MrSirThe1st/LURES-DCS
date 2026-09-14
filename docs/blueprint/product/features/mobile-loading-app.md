# Mobile loading app

## Purpose

Dedicated mobile application for two field roles on the same Expo app: loading-floor personnel verify bags and complete trucks; a yard agent registers trucks when they arrive.

## Design

See [../design-dna.md](../design-dna.md).

Platform-native patterns; same product language as the desktop app, not a visual clone.

## Users

- Loading / operational staff
- Yard agent (arrivals; same app, different login)

## Screens

Implemented (V1 slice):

- Login (loading staff or yard agent)
- Today’s trucks (loading staff)
- Yard queue + confirm expected arrival + register unplanned (yard agent)
- Truck loading record + complete truck
- Bag verification / modification with required reason on changes
- i18n (zh / en / fr; default `fr`; Settings language switch; `profiles.preferred_locale`)

Deferred / out of V1 completion track ([ADR-002](../../decisions/ADR-002.md)):

- Hold/cancel on mobile — **Phase 4 closed as deferred** (management-only in V1); enforced by `canMobileTransitionTruckStatus` / `assertMobileTruckStatusTransition`; do not implement unless ADR-002 is revised
- Offline mode
- QR/barcode truck open (explicitly excluded from current execution plan)

## Behaviors

Known from product knowledge:

- Fast truck identification and bag verification (hundreds/day possible)
- Record verifier identity, timestamp, and values at verification
- Modifications preserve history (previous/new, who, when, reason when required)
- Trucks are read-only on mobile until management marks **Available**
- Controlled truck status transitions with audit (`available → loading` on first bag verify/edit; complete only from `loading`)
- Real-time sync with the desktop management application through Supabase
- Loading staff do **not** Hold / Cancel trucks in V1
- Yard agents confirm expected Loading Order trucks (search horse → verify known details → confirm) while the order is **active**. A paused Loading Order is read-only in the yard. Unplanned register only when the plate is not on a pre-alert. They do **not** verify bags or assign program days.
- QR/barcode truck open: future feature (not in current scope)

## Data

Screen → UI/state → query/mutation layer → API/backend boundary. No privileged DB credentials on device.

## Out of scope

- Full offline-first mode in V1 (architecture must not forbid it later)
- Making mobile identical to the desktop layout
- Public app-store consumer positioning
- QR/barcode as a V1 requirement
- Mobile hold/cancel (unless ADR-002 revised)

## Open questions

- Exact truck search/filter UX
- Which bag fields operators may edit
- Offline conflict strategy (future)
- Approved Mandarin / French domain terminology lists (locale UX is locked; glossary terms still TBD)
