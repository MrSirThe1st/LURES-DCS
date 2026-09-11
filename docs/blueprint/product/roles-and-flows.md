# Roles and flows

## Roles

| Role | Access scope (V1 — locked in [ADR-002](../decisions/ADR-002.md)) |
|------|------------------------------------------------------------------|
| Management | Desktop: import/create lists; Available / Hold / Cancel; monitor; History; lean Reports; Export/print; Send (OS share/mail with PDF); manage users; own locale |
| Loading / operational staff | Mobile: view today’s trucks; verify/edit bags with reason; complete truck; own locale. **No** Hold / Cancel; **no** import, export, reports, or user admin |

Do not assume every user has all permissions. There is no separate view-only management role in V1.

### Permission matrix

| Capability | Management | Loading staff |
|------------|:----------:|:-------------:|
| View today’s trucks / bags | Yes | Yes (Waiting read-only until Available) |
| Import / create loading lists | Yes | No |
| Mark Available / Hold / Cancel | Yes | No |
| Verify / edit bags | Authorized office edits as UI allows | Yes |
| Complete truck | No | Yes |
| History / audit (desktop) | Yes | No (mobile shows truck-level events on its journey only) |
| Reports | Yes | No |
| Export / print | Yes | No |
| Send (PDF via OS mail/share) | Yes | No |
| Manage users | Yes | No |
| Change own preferred locale | Yes | Yes |

Authorization: server-side + RLS + trusted use-case checks. Never trust client-supplied role fields.

## Core journeys

### Management

```
Login
  ↓
Daily loading overview
  ↓
Import/create daily loading schedule (Waiting)
  ↓
Mark trucks Available / Hold / Cancel
  ↓
Monitor loading progress (floor → Loading → Completed)
  ↓
Open individual truck
  ↓
Review bags, weights, seals and other information
  ↓
Review modifications/events
  ↓
View completed loading records (History)
  ↓
Export/print final records
  ↓
Send PDF via OS mail/share (optional)
```

1. Authenticate as Management
2. Open today’s operational overview
3. Import or create the daily loading list (trucks start Waiting)
4. Mark trucks **Available** (or Hold / Cancel) — do not set Loading
5. Monitor progress bars and statuses as the floor works
6. Open a truck to review bags and audit events
7. Use History for past days / full audit filters
8. Export/print completed records; Send shares the PDF via the OS

### Loading / operational staff (mobile)

```
Login
  ↓
Today's Trucks
  ↓
Select Truck (Available or Loading)
  ↓
Truck Loading Record
  ↓
Review/verify individual bags (first op → Loading)
  ↓
Record changes if necessary
  ↓
Complete truck
```

1. Authenticate as loading staff
2. Open today’s truck list (Waiting trucks are visible but read-only)
3. Select an Available/Loading truck (QR/barcode scan is out of V1)
4. Verify bags (who/when/what recorded); first bag op moves truck to Loading
5. Record authorized modifications with reason when required
6. Mark truck completed when appropriate

Hold / Cancel are **not** available on mobile in V1.

## Cross-cutting rules

| Concern | Rule |
|---------|------|
| Authentication | Supabase Auth; authenticated internal users only |
| Authorization | Server-side + RLS; matrix in ADR-002 |
| Tenancy | Internal company system; multi-org TBD |
| Notifications | No automated WhatsApp/email in V1; Send = OS mail/share of PDF |
| Auditability | Important changes and status transitions create immutable audit events (from normal UI); export is audited |
| Error handling | Clear operational errors; no secret leakage |
| Realtime | Desktop and mobile share one DB; updates visible without file exchange |
| Offline | Important future consideration; not V1 requirement |
| Import | Excel/CSV liste de colisage multi-file; Append or Replace; see import-format.md |
| Bulletin de pesage | Deferred until stakeholders confirm (does not block V1 completion track) |
| Market | DRC only |
| Languages | Mandarin, English, French; **default `fr`**; switch on Settings; persist `profiles.preferred_locale` |
