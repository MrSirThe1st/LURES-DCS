# Glossary

Entity glossary from documented product knowledge. Meanings stay conceptual until schema design, except where a code name is already in use.

| Term | Meaning | Code name | Notes |
|------|---------|-----------|-------|
| User | Authenticated company user | `profiles` | Roles: Management, Loading staff, Yard agent. No fourth “controller” or client-checker login yet. |
| External person | Client/company representative or checker associated with a client | `external_persons` | Extensible person record; optional later `profile_id`. Record who verified information (`trucks.information_verified_by_person_id`). Not an auth role in this slice. |
| Organization | Company / org context | TODO | Multi-org TBD |
| Vehicle | Physical horse or trailer identity | `vehicles` | Distinct from an operational trip. Registration stored normalized for identity; trip rows keep the source spelling. Full vehicle registries are deferred. |
| Pre-alert / Loading Order | Expected trucks from a client pre-alert | `pre_alerts` + `pre_alert_lines` + expected `trucks` | Lifecycle: `draft` / `active` / `paused` / `closed` / `cancelled`. Pause keeps expected trucks in the yard as read-only. Delete removes expected / did-not-arrive / cancelled-expected trucks from the yard. `closed` remains for historical rows; new orders are paused or deleted, not closed. |
| Loading Program / BP | Bulletin de pesage / loading program | `loading_lists` | **Not** a packing-list bundle. Informal name e.g. BP049. Excel export clones the company BP layout. |
| Liste de colisage | Per-truck packing sheet (header + bags) | one `trucks` row + `bags` | Lot/EXLOT → `trucks.packing_list_number` |
| Truck / trip | One operational loading of a physical vehicle | `trucks` | Not a PDF. Not the same as `vehicles`. |
| Bag | Individual bag/unit with number, net weight, seal | `bags` | Per-truck children |
| Driver | Driver associated with a truck load | truck fields | Name, phone, passport reference — stored as supplied by the source document |
| Transporter | Transport company label on a source document | `transporter_name` | Preserve exact source spelling. Do **not** normalize aliases for matching. |
| Organization name alias | Optional later mapping of different labels for the same org | `organization_name_aliases` | Planned only. Matching must **not** use this table. |
| Yard arrival | Physical confirmation that an expected or unplanned truck is on site | `trucks.arrival_status = arrived` | FIFO by `arrived_at`. Independent of BP order and loading order. |
| Unplanned arrival | Arrived without a pre-alert | `trucks.unplanned` | Badge: UNPLANNED / NOT ON PRE-ALERT. Yard agent and management may register. |
| Field source / provenance | Which document or actor last confirmed a trip field | `trucks.field_sources` | `pre_alert` \| `yard` \| `bp` \| `packing_list` \| `manual`. Yard-sourced fields are never silently overwritten. |
| Audit Event | Immutable recorded change or operational event | `audit_events` | Fundamental requirement; preserve previous/new value and source |
| Attachment / Document | Generated or uploaded document related to loading | Storage `operational-documents` | Original Loading Order files; PDF is an output |

## Three documents, three objects

Do not collapse these:

1. **Pre-alert / Loading Order** — expected trucks (`pre_alerts`)
2. **Loading Program / BP** — `loading_lists` (bulletin). Not a packing list.
3. **Packing list** — per-truck `trucks.packing_list_number` + `bags`

There is not one BP per day as a product rule. Assign-to-loading-date remains a **bridge** for trucks not yet on a BP (`bulletin_number` null).

## Three independent orders

| Order | Source | Field |
|-------|--------|-------|
| Arrival order | Yard confirmation | `arrived_at` |
| Loading Program / BP order | BP sequence | `program_sequence` |
| Actual loading order | Floor start | `loading_started_at` |

Do not sort or overwrite one using another.

## Matching and labels

- Match pre-alert ↔ BP primarily by **normalized horse/truck registration**.
- Do **not** require transporter-name (or client/driver/location) normalization.
- Preserve transporter / client / driver / location values **exactly as supplied** by each source document unless a user explicitly edits them.
- Different source documents may legitimately use different labels for the same organization (e.g. pre-alert `FORSH` vs BP legal name).
- Excel import/export preserves source conventions rather than rewriting them.
- `On Site` on a Loading Order is **not** yard arrival.

## Open-plate uniqueness

One open operational trip per horse: `arrival_status` in (`expected`, `arrived`) and floor `status` not `completed` / `cancelled`. Cancel expected or delete the Loading Order (expected leftovers are cancelled; did-not-arrive leave the yard list) frees the plate. Pause does **not** free the plate. No auto-expiry. Historical `did_not_arrive` rows come from orders closed before pause/delete.

## Status / lifecycle

### Pre-alert statuses

| Status | Intent |
|--------|--------|
| Draft | Composed, not yet operational |
| Active | Expected trucks may be confirmed at the yard |
| Paused | Expected trucks stay in the yard; confirm and cancel are disabled until resume |
| Closed | Historical; leftover expected trucks were marked did not arrive. New orders are paused or deleted instead. |
| Cancelled | Order cancelled |

### Arrival statuses (independent of floor TruckStatus)

| Status | Intent |
|--------|--------|
| Expected | On a Loading Order; not yet confirmed at the yard (confirm allowed only while the order is active) |
| Arrived | Confirmed at the yard (planned or unplanned) |
| Cancelled | Expected trip cancelled; plate freed |
| Did not arrive | Historical leftover from an order that was closed; delete the order to remove these from the yard |

### Truck statuses (floor; naming may be refined)

| Status | Intent |
|--------|--------|
| Waiting | In the yard or on a program day; floor read-only until released |
| Available | Management released for floor; work not started yet |
| Loading | Floor has started bag verify/edit |
| Completed | Floor marked loading finished |
| On Hold | Operational issue; paused (resume → Available) |
| Cancelled | Loading cancelled |

Primary happy path: `Import Loading Order → yard confirm arrival → assign program day (bridge) → upload packing list → Waiting → Available → Loading → Completed`.

### Bag verification

Verified bags should record who verified, when, information present at verification, and later modifications.

Exact bag verification enum: **TODO: define when known**

Do not invent additional lifecycle states.

## Terminology consistency

- Prefer **Pre-alert** or **Loading Order** for expected trucks; DB: `pre_alerts`
- Prefer **Loading Program / BP** for the bulletin; DB: `loading_lists`
- Prefer **Liste de colisage** for one truck’s packing sheet; DB: one `trucks` row + `bags`
- Prefer **Truck** for the operational trip (not “the PDF”, not the physical vehicle registry)
- Prefer **Vehicle** for physical horse/trailer identity
- Prefer **Bag** for each weighed/sealed unit
- Prefer **Audit Event** for history entries
- Total truck weight should be calculated from bag weights rather than trusted alone as a manual-only total
- Product languages: **Mandarin**, **English**, **French** — keep glossary meanings aligned across all three; do not invent translations here

TODO: add approved Mandarin / English / French term equivalents when confirmed

## Prohibited ambiguous synonyms

| Avoid treating as identical without care | Prefer |
|------------------------------------------|--------|
| Document / PDF as the truck itself | Truck record + generated document |
| Loading Program / BP as a packing list | `loading_lists` vs `trucks.packing_list_number` + `bags` |
| Physical vehicle as the operational trip | `vehicles` vs `trucks` |
| Transporter code vs legal name as a match key | Match by normalized horse plate |
| Silently replacing yard data with BP data | Show conflict; management resolves; audit provenance |
| “Form” as the database model | Operational entities |
| Untracked overwrite of seal/weight | Modification + audit event |
