# PROJECT KNOWLEDGE — Truck Loading & Dispatch Control System

**Project code:** LURES-DCS  
**Document status:** Source of truth for product vision, requirements, workflows, and architecture direction  
**Last updated:** 3 September 2026  

> **Development rule:** Read this file before making architectural or product decisions. Do not invent business requirements. Do not silently change intended workflows. If a requirement is unclear or contradictory, ask before implementing. Prefer a simple, reliable implementation over unnecessary complexity.

---

## 1. Project purpose

The company currently manages loading of trucks carrying mineral/concentrate cargo using printed paper packing/loading lists.

A typical paper document includes information such as:

- Packing/list number
- Date
- Cargo description
- Truck/vehicle registration
- Trailer registration
- Driver
- Driver passport/reference
- Loading location
- Transport company
- Transit information
- Border
- Agent
- Individual bags
- Net weight of every bag
- Seal number of every bag
- Total cargo weight
- Beneficiary
- Other responsible parties/signatures

A real example contains approximately **20 bags for one truck**, with each bag having a bag number, net weight, and seal number.

On busy days, the company can have approximately **23 trucks loading**, with each truck potentially having **23 or more bags**. This means **hundreds of individual bag, weight, and seal verification operations** can occur during a single day's loading operation.

### Problems with the paper-based process

- Manual data entry
- Risk of transcription errors
- Difficulty tracking modifications
- Paper can be lost or damaged
- Management does not have real-time visibility
- Difficult to know which trucks are currently loading
- Difficult to know which trucks have completed loading
- Difficult to determine who changed information
- Difficult to reconstruct what happened after the fact
- Repetitive work for loading operators and management
- Difficulty consolidating final loading records

### Goal

Replace the paper-heavy operational process with a centralized digital **Truck Loading & Dispatch Control System**.

The system should become the **operational source of truth** for truck loading.

### Critical product principle

The system must **not** merely be a digital version of the paper form. The underlying data must represent the **actual loading operation**. Paper/PDF documents should eventually be treated as **generated representations** of that data — outputs/reports, not the primary data store.

The existing paper loading/packing sheet is a **reference for the business process**. Do not make the paper document the database model.

---

## 2. Core product concept

The system has **two dedicated applications** connected to the **same centralized backend**.

| Application | Audience | Purpose |
|-------------|----------|---------|
| **A. Dedicated desktop application** | Company management / authorized office staff | Manage and monitor the truck loading operation |
| **B. Dedicated mobile application** | Personnel physically checking/loading trucks | Digitize the manual paper-based loading/checking process |

Both applications operate on the **same centralized records**.

### Conceptual architecture

```
        DESKTOP APPLICATION
        Management
              │
              │
              ▼
           SUPABASE
      PostgreSQL / Auth
      Realtime / Storage
              ▲
              │
              │
        MOBILE APPLICATION
        Loading Operations
```

- The **database is the single source of truth**.
- There must **never** be separate copies of truck/loading data maintained independently by the desktop and mobile applications.
- If a loading operator changes a seal number, weight, bag status, or similar field, the change is written to the central backend and management should see it **in real time**.
- Authorized management changes should be reflected in the mobile application.
- Do **not** describe changes as files being manually uploaded between applications.

### What this product is not

Do **not** describe or implement the management client as:

- a web application
- a web dashboard
- a browser application
- a desktop browser interface
- a Next.js management application
- management accessed from a browser

The management client is a **dedicated desktop application**. Do not add a web application unless stakeholders explicitly decide to do so later.

---

## 3. Desktop application — management

A dedicated desktop application used by company management and authorized office staff.

Its purpose is to manage and monitor the truck loading operation.

Management should eventually be able to:

- Log in
- Upload/import the daily list of trucks to be loaded
- View the day's loading schedule
- View all trucks and their current status
- Open individual truck loading records
- Review bags, weights, seals and other loading information
- Make authorized modifications
- See modifications made by loading personnel in real time
- Monitor which trucks are waiting, loading, completed, on hold or cancelled
- Review the audit/history of changes
- Export/print final loading records
- Manage users and permissions where applicable

### Agreed desktop technology

**Tauri 2** is the agreed desktop shell. The management UI runs inside the packaged desktop application (not in a browser).

UI toolkit, state-management library, and deployment/CI details beyond Tauri 2 + the shared Supabase backend are **not fully locked** and should not be invented.

### Main management workflow

```
Login
  ↓
Daily loading overview
  ↓
Import/create daily loading schedule
  ↓
View trucks scheduled for loading
  ↓
Monitor loading progress
  ↓
Open individual truck
  ↓
Review bags, weights, seals and other information
  ↓
Review modifications/events
  ↓
View completed loading records
  ↓
Export/print final records
```

Management should be able to **upload the daily truck loading list** rather than manually creating every truck and bag one by one.

Initial intended import format: **Excel/CSV** (exact format and mapping to be defined later from real company data).

### Import concept

```
Daily Loading Plan
        ↓
Import
        ↓
23 trucks created
Hundreds of bags created
        ↓
Loading operators verify/modify information
        ↓
Management sees changes in real time
```

---

## 4. Management operational overview

The desktop application should provide a clear **operational overview** of the day's loading work. This is an in-app view for office staff, not a browser dashboard.

### Example overview (illustrative only — exact UI not defined)

```
TODAY — 3 SEPTEMBER 2026

23 Trucks Scheduled

Truck       Bags      Weight       Status
T681ERQ     20        30,590 kg    Completed
T682ERQ     23        34,120 kg    Loading
T683ERQ     21        31,870 kg    Waiting
...
```

The overview should prioritize **operational visibility** rather than decorative analytics.

### Questions management must be able to answer quickly

- How many trucks are scheduled today?
- How many are waiting?
- How many are currently loading?
- How many have completed?
- Which truck is currently being worked on?
- Which trucks have issues?
- Which trucks are on hold?
- What has changed?
- Who made a change?
- What is the current total weight?
- Which trucks still need attention?

---

## 5. Truck record

Each truck has a digital loading record.

### Conceptual fields (flexible until full company workflow/document review)

- Vehicle registration
- Trailer registration
- Driver
- Driver identification/passport reference (where applicable)
- Transport company
- Loading location
- Transit information
- Border
- Agent
- Packing/list number
- Cargo description
- Date
- Status
- Bags
- Total calculated weight
- Audit history
- Other relevant operational information

**Note:** Exact fields remain flexible until the company's complete workflow and documents have been reviewed. Do not lock the schema prematurely to the paper form layout alone.

A truck is an **operational entity**, not a PDF. It has:

- Planned information
- Loading status
- Bags
- Weights
- Seals
- Verification events
- Modifications
- Responsible users
- Completion state
- History

---

## 6. Bag record

Each truck contains multiple bags. Each bag is an **individual database record**.

### Conceptual fields

- Bag ID / database ID
- Bag number / reference
- Net weight
- Seal number
- Verification status
- Verification timestamp
- Person who verified it
- Modification history
- Other relevant fields identified later

### Example

```
Truck: T681ERQ

Bag 1
Bag No: LU-CC26082392
Weight: 1551 kg
Seal No: 116094

Bag 2
Bag No: LU-CC26082393
Weight: 1706 kg
Seal No: 116098
```

### Weight calculation rule

The system should **calculate the truck's total weight from its individual bag weights**, rather than relying exclusively on a manually entered total.

---

## 7. Mobile application — loading operations

A dedicated mobile application used by the personnel physically checking/loading trucks.

Its purpose is to digitize the manual paper-based loading/checking process.

The mobile application should eventually allow authorized personnel to:

- Log in
- View the trucks scheduled for loading
- Find/select the correct truck
- View the truck's loading record
- View individual bags
- Verify bag information
- Verify/record net weights
- Verify/record seal numbers
- Make authorized corrections
- Provide a reason when required for a modification
- Complete the truck loading process
- Synchronize all changes with management in real time

Primary workflow must be **simple and optimized for fast operational use**.

### Conceptual mobile workflow

```
Login
  ↓
Today's Trucks
  ↓
Select/scan Truck
  ↓
Truck Loading Record
  ↓
Review/verify individual bags
  ↓
Record changes if necessary
  ↓
Complete truck
```

A mobile operator must be able to **quickly find the correct truck**.

The current mobile app in this repository uses **Expo / React Native**. That is the existing implementation starting point. Do not treat Expo as the only possible long-term mobile choice unless stakeholders confirm it; do not switch mobile frameworks without an explicit decision.

### Future identification (not V1 requirement)

Eventually, QR/barcode scanning should be considered so a truck or loading record can be identified without manually searching.

Example concept:

```
TRUCK
T681ERQ

Loading Record
EX202609-0376

[QR CODE]
```

Scanning the QR code should open the corresponding loading record. This is a **future feature**.

---

## 8. Bag verification

The mobile app must allow operators to verify individual bags.

### Example

```
Bag No: LU-CC26082392
Weight: 1551 kg
Seal No: 116094

[Verified]
```

### What verification must record

- Who verified the bag
- When it was verified
- What information was present at verification
- Any later modification

The verification workflow must be **fast enough to handle hundreds of bags during a busy day**.

---

## 9. Modifications and changes

Changes are a core part of the system. The loading list may contain information that changes during physical loading.

### Example

```
Original:
Seal = 116094

Modified:
Seal = 116095

Reason:
Seal damaged during loading
```

The system must **not simply overwrite the old value without preserving history**.

Important changes should create an **audit event**.

### Change visibility requirements

The system should be able to show:

- What changed
- Previous value
- New value
- Who changed it
- When it changed
- Reason for change, where required

**Note:** Exact authorization rules for which users can make which changes will be defined later.

---

## 10. Audit trail

An audit trail is a **fundamental requirement**, not an optional feature.

The company needs to know what happened during the loading operation.

### Example chronological history (illustrative)

```
10:32 — Bag 7 verified
10:34 — Seal 109476 entered
10:41 — Weight changed from 1742 kg to 1740 kg
10:41 — Modification made by Jean
10:48 — Truck marked Loading
11:17 — Truck marked Completed
11:18 — Final loading document generated
```

Example of a recorded modification:

```
10:41
Weight changed:
1742 kg → 1740 kg

Changed by:
Jean

Reason:
Correction after physical verification
```

This enables the company to **reconstruct what happened** during a loading operation.

### Immutability

Audit events should be **immutable from the normal application interface**.

The precise event model will be designed during implementation.

---

## 11. Truck statuses

### Initial conceptual statuses

| Status | Intent |
|--------|--------|
| Not Started / Waiting | Scheduled, not yet being worked |
| Loading | Actively being loaded/verified |
| Completed | Loading finished |
| On Hold | Operational issue; paused |
| Cancelled | Loading cancelled |

Exact naming can be refined later.

### Status transition principles

Status transitions should be **controlled**, not arbitrary.

Primary happy path:

```
Waiting
   ↓
Loading
   ↓
Completed
```

A truck may also be placed **On Hold** when an operational issue occurs.

Status transitions must be recorded in the **audit history**.

---

## 12. Real-time synchronization

The applications operate on **shared centralized data**.

### Example

A loading operator changes:

```
Seal: 116094 → 116095
```

The central database is updated. Management sees the updated value **in real time**, without a manual file upload or a required manual refresh workflow.

Likewise, if authorized management changes a truck detail, the mobile application receives the updated information.

### Conceptual sync flow

```
Mobile App → Central Database → Realtime update → Desktop App

Desktop App → Central Database → Realtime update → Mobile App
```

**Intended platform:** Supabase (PostgreSQL + Auth + Realtime + Storage).

---

## 13. Centralized data model

Design around **structured operational entities**, not documents.

### Conceptual entities (preliminary — not final schema)

- Users
- Organizations / company
- Loading Lists
- Trucks
- Bags
- Drivers
- Transporters
- Loading Operations
- Audit Events
- Attachments / Documents

### Simplified conceptual relationship

```
Loading List
    |
    +--- Truck
          |
          +--- Bag
          +--- Bag
          +--- Bag
          +--- ...
          |
          +--- Loading Events
```

The final database schema must be designed carefully during implementation. **Do not assume this preliminary list is the final schema.**

---

## 14. Loading lists

A loading list represents a planned loading operation or group of trucks for a particular date/reference.

### Conceptual fields

- Date
- Packing/list number
- Cargo description
- Planned trucks
- Other shipment information
- Status
- Created by
- Created timestamp

### Example

```
Packing List: EX202609-0376
Date: 3-Sep-26
Description: Concentrate de cuivre
```

**Localization / market notes:**
- The system is for use in the **DRC only**.
- The product must support **three languages: Mandarin, English, and French**.
- Exact approved terminology per language will be confirmed from company usage; do not invent translations.

---

## 15. Importing daily data

One of the main management functions will eventually be importing daily truck/loading information.

**Preferred first approach:** structured Excel/CSV import.

### Intended import flow (do not implement until format is confirmed)

1. Allow management to select a file
2. Read the structured data
3. Validate the data
4. Show an import preview
5. Identify errors or missing required fields
6. Allow the user to confirm the import
7. Create the appropriate loading list, trucks, and bags
8. Report what was imported

The exact spreadsheet format must be confirmed from **real company data** before implementation.

---

## 16. Final documents

The current paper process produces physical loading/packing documentation.

The digital system should eventually generate a final loading document/PDF from the **current database state**.

- Generated document may resemble the existing paper form
- Database remains the source of truth
- PDF is an **output/report**, not the primary data store
- Operational data is the source of truth; the final document is an output of that data

### Possible later capabilities (not all necessarily V1)

- PDF generation
- Printing
- Digital signatures
- Document archival
- Document attachments

---

## 17. Users and access

Internal company application with authenticated users.

### Minimum conceptual user categories

1. **Management**
2. **Loading / operational staff**

The exact role/permission model should be designed before implementation.

### Potential permissions (illustrative)

- View loading schedules
- Create loading lists
- Import data
- Edit truck information
- Edit bag information
- Verify bags
- Change truck status
- Put truck on hold
- Complete truck
- View audit history
- Export records
- Manage users

**Do not assume every user should have all permissions.**

---

## 18. Internal application distribution

This is a **company/internal operational system**, not a public consumer application.

| App | Initial distribution concept |
|-----|------------------------------|
| Management | Dedicated desktop application installed on company computers (Tauri 2) |
| Mobile | Dedicated mobile application for authorized company personnel only |

The system does **not** need to be treated as a public consumer application. Design with private/internal use in mind.

Possible future mobile distribution: private organizational distribution or controlled installation (not necessarily a publicly discoverable store listing). This is a **deployment concern for later** and should not unnecessarily influence initial product architecture.

Do not invent a full deployment or CI/CD architecture here.

---

## 19. Offline consideration

Operational loading should not completely stop because of a temporary network interruption.

**Offline capability is an important future consideration** for the mobile application (not a confirmed V1 requirement).

### Future offline goals

- Cache the relevant day's loading data
- Continue verification during temporary connectivity loss
- Store changes locally
- Synchronize when connectivity returns
- Resolve conflicts safely

Architecture should **avoid making future offline support impossible**, without implementing offline mode in early phases.

---

## 20. Security

The system contains operational company information; access must be controlled.

### Future implementation considerations

- Authentication
- Authorization
- Role-based access
- Row Level Security (RLS)
- Secure database access
- Auditability
- Data validation
- Protection against unauthorized modification
- Secure file/document storage

**Intended backend platform:** Supabase.  
Do not implement security configuration until implementation phase begins with a defined permission model.

The desktop UI bundle and the mobile app must never receive the Supabase **service-role** key. Privileged operations belong in trusted backend paths (Supabase with RLS, and/or Tauri native commands if later required).

---

## 21. Technology direction

| Layer | Direction |
|-------|-----------|
| Backend | **Supabase** — PostgreSQL, Authentication, Realtime, Storage, and database functionality needed for the application |
| Management | **Dedicated desktop application — Tauri 2** |
| Mobile | Dedicated mobile application (current repository starting point: Expo / React Native) |

Do **not** lock in or invent:

- State-management library
- Specific UI component library beyond what already exists for scaffolding
- Deployment architecture
- CI/CD architecture

Shared TypeScript libraries exist in this repository so desktop and mobile can reuse domain types and tokens. That is **repository organization**, not a product decision that the system “must be a monorepo.”

---

## 22. Design principles

Prioritize **operational reliability** over visual complexity.

### Principles

- Fast data entry
- Minimal unnecessary clicks
- Clear truck status
- Clear bag status
- Easy identification of the correct truck
- Real-time visibility
- Strong auditability
- Accurate calculations
- Controlled modifications
- Clear error states
- Easy-to-understand interfaces
- Mobile usability in a physical loading environment
- Desktop usability for management
- Avoid unnecessary features in V1

The mobile application should be designed for people actively working around trucks/loading operations — interactions must be **simple and practical**.

---

## 23. Data accuracy

Data accuracy is one of the most important objectives.

### Minimize

- Wrong truck selection
- Wrong bag assignment
- Duplicate bags
- Invalid weights
- Incorrect seal numbers
- Incorrect totals
- Untracked modifications

### Validation areas to establish later (do not invent company-specific rules early)

- Required fields
- Weight values
- Duplicate bag numbers
- Duplicate seal numbers where applicable
- Truck identification
- Status transitions
- Completed records
- Import consistency

---

## 24. Future features

Potential future functionality (possibilities only — **not confirmed V1 requirements**):

- QR code scanning
- Barcode scanning
- OCR / document recognition / document extraction
- Automatic extraction from existing packing-list PDFs/images
- Photo evidence
- Digital signatures
- Offline mobile mode
- Automatic PDF generation
- WhatsApp notifications
- Email notifications
- Advanced reporting
- Loading performance analytics
- Historical searches
- Weight-scale integration
- Printer integration
- Driver management
- Transporter management
- Multi-site support
- Multiple companies/organizations
- Shipment/export tracking
- Approval workflows

---

## 25. Important product principle (recap)

Do **not** design the system around the current paper document alone.

The current document is evidence of the business process, but the application must model the **underlying operational workflow**.

The final document can be generated from structured operational data.

---

## 26. Initial V1 scope

Keep V1 focused. Do not expand unnecessarily.

### Desktop (V1 target)

- Authentication
- Daily loading management
- Import/create loading lists
- Truck management
- Truck details
- Bag details
- Loading status
- Real-time monitoring
- Modification visibility
- Audit history
- Export/print

### Mobile (V1 target)

- Authentication
- Today's trucks
- Truck selection
- Truck loading record
- Bag verification
- Weight/seal recording
- Authorized corrections
- Modification reasons
- Truck completion
- Real-time synchronization

---

## 27. Current paper document reference

A real company loading document was provided as a visual reference during project definition.

### Sample reference data (business-process reference only)

| Field | Example value |
|-------|----------------|
| Company | LUILU RESSOURCES SAS |
| Description | CONCENTRÉ DE CUIVRE |
| Packing List | EX202609-0376 |
| Date | 3-Sep-26 |
| Truck | T681ERQ |
| Trailer | T766ERT |
| Driver | AMIMU MDAILE |
| Loading location | L'USINE DE LUILU |
| Transporter | VAN MO COMPANY LIMITED |
| Border | Dar es Salaam |
| Agent | CONNEX |

The document contains **20 individual bags** for this truck, with a **total net weight of 30,590 kg**.

Each row contains a bag number, net weight, and seal number.

**Important:** This document is provided only as a business-process reference. Do **not** assume that its exact layout, fields, or terminology represents the final application design.

---

## 28. Development rules for future work

This documentation file is the project's **source of truth**.

When implementing:

1. Read this file before making architectural decisions.
2. Do not invent business requirements.
3. Do not silently change the intended workflow.
4. If a requirement is unclear or contradictory, **ask before implementing**.
5. If a technical decision materially affects the business workflow, explain the issue before proceeding.
6. Keep the system focused on the truck loading operation.
7. Prefer a simple reliable implementation over unnecessary complexity.
8. Do not reintroduce a web/browser management client.
9. Do not describe or impose an unapproved “monorepo product architecture.”

---

## 29. Open decisions (confirm before locking design)

The following items are intentionally deferred and must be confirmed with stakeholders before or during early implementation:

| Topic | Status |
|-------|--------|
| Exact Excel/CSV import format and field mapping | To be confirmed from real company data |
| Exact truck/bag field list and Mandarin / English / French terminology | Flexible pending document/workflow review |
| Default UI language and language-switch behavior | Three languages required (Mandarin, English, French); details TBD |
| Geographic scope | DRC only |
| Role/permission matrix | To be designed before implementation |
| Truck status naming and allowed transitions | Conceptual only; refine later |
| Audit event model | Design during implementation |
| Validation rules (weights, duplicate seals, etc.) | Do not invent company-specific rules early |
| Offline mobile sync/conflict strategy | Future consideration; keep architecture open |
| PDF layout vs paper resemblance | Output later; DB remains source of truth |
| Mobile distribution method | Later deployment concern |
| Desktop UI library / state management | Not locked beyond Tauri 2 |
| Long-term mobile framework | Current starting point is Expo; confirm before a switch |
| Deployment / CI/CD | Not defined |

---

## 30. Glossary (working)

| Term | Meaning |
|------|---------|
| Loading list / packing list | Planned loading operation or group of trucks for a date/reference |
| Truck record | Digital operational record for one vehicle load |
| Bag | Individual bag/unit on a truck with number, net weight, and seal |
| Seal | Seal number associated with a bag |
| Verification | Operator confirmation of bag data during physical loading |
| Audit event | Immutable recorded change or operational event |
| Management app | Dedicated desktop application for supervisors/office staff |
| Mobile loading app | Dedicated mobile application for loading-floor operators |
| Source of truth | Centralized Supabase/PostgreSQL database of operational entities |

---

*End of project knowledge document. This file should be updated when stakeholders confirm deferred decisions; until then, treat deferred items as open rather than inventing answers.*
