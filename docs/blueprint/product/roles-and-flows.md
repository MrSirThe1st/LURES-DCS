# Roles and flows

## Roles

| Role | Access scope (V1 — locked in [ADR-002](../decisions/ADR-002.md)) |
|------|------------------------------------------------------------------|
| Management | Desktop: import Loading Orders; yard expected/arrived/did-not-arrive + assign to program date; import Loading Program / BP; import packing lists; Available / Hold / Cancel; monitor; History; lean Reports; Export/print; Send (OS share/mail with PDF); manage users; own locale. May register unplanned arrivals. |
| Loading / operational staff | Mobile: view today’s trucks; verify/edit bags with reason; complete truck; own locale. **No** Hold / Cancel; **no** yard register, import, export, reports, or user admin |
| Yard agent | Mobile: search/confirm expected trucks; register unplanned arrivals; view the arrived queue. **No** bag verify, Available, import, or program assign |

Do not assume every user has all permissions. There is no separate view-only management role in V1. Client checkers remain `external_persons` (no login) until a later decision.

### Permission matrix

See [ADR-002](../decisions/ADR-002.md) for the full three-role table. Summary: management imports Loading Orders; yard agents confirm expected trucks (or register unplanned); management assigns program days and packing lists; loading staff verify bags and complete trucks.

Authorization: server-side + RLS + trusted use-case checks. Never trust client-supplied role fields.

## Core journeys

### Management

```
Login
  ↓
Pre-alerts — import Loading Order (expected trucks)
  ↓
Yard — expected / arrived / did not arrive
  ↓
Assign arrived trucks to a program date (bridge if not yet on a BP)
  ↓
Daily loading overview — import / export Loading Program / BP
  ↓
Upload packing lists onto programmed plates
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
2. Import a client Loading Order on Pre-alerts (creates expected trips; labels stored as written)
3. Yard: expected trucks wait for phone confirmation; arrived queue is FIFO by `arrived_at`
4. Import a Loading Program / BP on Loading (match by horse plate), or assign arrived trucks to a program date (daily max is a UI cap; bridge for trucks not yet on a BP)
5. Open that date on Loading
6. Upload listes de colisage (attach bags to those plates)
7. Mark trucks **Available** (or Hold / Cancel) — packing list required before Available
8. Monitor progress bars and statuses as the floor works
9. Open a truck to review bags and audit events
10. Use History for past days / full audit filters
11. Export/print completed records; Send shares the PDF via the OS

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

Hold / Cancel are **not** available on mobile in V1 (**Phase 4 closed as deferred** — ADR-002).

### Yard agent (mobile)

```
Login
  ↓
Search expected horse (from Loading Order)
  ↓
Confirm arrival (edit only if yard sees a difference — provenance becomes yard)
  ↓
Arrived queue (FIFO) until management assigns a program date
```

Unplanned: register only when the plate is **not** on a pre-alert. Badge UNPLANNED / NOT ON PRE-ALERT.

1. Authenticate as yard agent on the phone (same Expo app as loading staff)
2. Search the expected horse; confirm known details — do not retype the Loading Order from scratch
3. If the truck is not on a pre-alert, register it as unplanned
4. See arrived trucks in the yard queue until management assigns a program date

Yard agents do **not** verify bags, mark Available, or assign program days.

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
| Import | Loading Order → expected trucks; Loading Program / BP onto arrived/expected plates (or unplanned); liste de colisage multi-file onto those plates; see import-format.md |
| Loading Program / BP | Shipped. Never silently overwrite yard-confirmed fields with BP data; show conflict; management resolves (keep yard default); preserve `field_sources` in audit |
| Labels | Preserve transporter/client/driver/location exactly as each source document wrote them. Match pre-alert ↔ BP by normalized horse plate, not transporter-name aliases |
| Market | DRC only |
| Languages | Mandarin, English, French; **default `fr`**; switch on Settings; persist `profiles.preferred_locale` |
