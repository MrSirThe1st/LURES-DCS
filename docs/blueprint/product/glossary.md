# Glossary

Entity glossary from documented product knowledge. Meanings stay conceptual until schema design.

| Term | Meaning | Code name | Notes |
|------|---------|-----------|-------|
| User | Authenticated company user | `profiles` | Roles: Management, Loading staff |
| Organization | Company / org context | TODO | Multi-org TBD |
| Packing list (bundle) | Daily bulletin group of trucks / listes de colisage | `loading_lists` | Bulletin ref in `packing_list_number` |
| Liste de colisage | Per-truck packing sheet (header + bags) | one `trucks` + `bags` | Lot NO → `trucks.packing_list_number` |
| Bulletin de pesage | Daily summary of trucks for a packing list | informs `loading_lists` | Optional import later — **Phase 8 deferred** |
| Loading List | Synonym for packing-list bundle for a date | `loading_lists` | Prefer this operational name in UI when helpful |
| Truck | Operational loading record for one vehicle load | `trucks` | Not a PDF |
| Bag | Individual bag/unit with number, net weight, seal | `bags` | Per-truck children |
| Driver | Driver associated with a truck load | truck fields | Name + passport reference |
| Transporter | Transport company | `transporter_name` | |
| Loading Operation | Operational loading activity/context | TODO | Precise model TBD |
| Audit Event | Immutable recorded change or operational event | `audit_events` | Fundamental requirement |
| Attachment / Document | Generated or uploaded document related to loading | TODO | PDF is an output |

## Status / lifecycle

### Truck statuses (conceptual; naming may be refined)

| Status | Intent |
|--------|--------|
| Waiting | Imported / scheduled; floor read-only until released |
| Available | Management released for floor; work not started yet |
| Loading | Floor has started bag verify/edit |
| Completed | Floor marked loading finished |
| On Hold | Operational issue; paused (resume → Available) |
| Cancelled | Loading cancelled |

Primary happy path: `Waiting → Available → Loading → Completed`. Management sets Available / Hold / Cancel only; Loading starts on first floor bag operation; Completed is set from mobile.

### Bag verification

Verified bags should record who verified, when, information present at verification, and later modifications.

Exact bag verification enum: **TODO: define when known**

Do not invent additional lifecycle states.

## Terminology consistency

- Prefer **Packing list** for the daily **bundle** (bulletin + many listes de colisage); DB: `loading_lists`
- Prefer **Liste de colisage** for one truck’s sheet; DB: one `trucks` row + `bags`
- Prefer **Truck** for the operational entity (not “the PDF”)
- Prefer **Bag** for each weighed/sealed unit
- Prefer **Audit Event** for history entries
- Total truck weight should be calculated from bag weights rather than trusted alone as a manual-only total
- Product languages: **Mandarin**, **English**, **French** — keep glossary meanings aligned across all three; do not invent translations here

TODO: add approved Mandarin / English / French term equivalents when confirmed

## Prohibited ambiguous synonyms

| Avoid treating as identical without care | Prefer |
|------------------------------------------|--------|
| Document / PDF as the truck itself | Truck record + generated document |
| “Form” as the database model | Operational entities |
| Untracked overwrite of seal/weight | Modification + audit event |
