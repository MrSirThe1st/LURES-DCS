# Glossary

Entity glossary from documented product knowledge. Meanings stay conceptual until schema design.

| Term | Meaning | Code name | Notes |
|------|---------|-----------|-------|
| User | Authenticated company user | TODO | Roles: Management, Loading staff |
| Organization | Company / org context | TODO | Multi-org TBD |
| Loading List | Planned loading operation or group of trucks for a date/reference | TODO | Also related to packing list number |
| Truck | Operational loading record for one vehicle load | TODO | Not a PDF |
| Bag | Individual bag/unit with number, net weight, seal | TODO | Per-truck children |
| Driver | Driver associated with a truck load | TODO | Fields TBD |
| Transporter | Transport company | TODO | |
| Loading Operation | Operational loading activity/context | TODO | Precise model TBD |
| Audit Event | Immutable recorded change or operational event | TODO | Fundamental requirement |
| Attachment / Document | Generated or uploaded document related to loading | TODO | PDF is an output |

## Status / lifecycle

### Truck statuses (conceptual; naming may be refined)

| Status | Intent |
|--------|--------|
| Waiting (Not Started) | Scheduled, not yet worked |
| Loading | Actively being loaded/verified |
| Completed | Loading finished |
| On Hold | Operational issue; paused |
| Cancelled | Loading cancelled |

Primary happy path: `Waiting → Loading → Completed`. Transitions must be controlled and audited.

### Bag verification

Verified bags should record who verified, when, information present at verification, and later modifications.

Exact bag verification enum: **TODO: define when known**

Do not invent additional lifecycle states.

## Terminology consistency

- Prefer **Loading List** for the planned group; packing/list number is a field/reference
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
