# Roles and flows

## Roles

| Role | Permissions |
|------|-------------|
| Management | TODO: define access scope |
| Loading / operational staff | TODO: define access scope |

Potential permission areas (not yet assigned): view schedules, create/import lists, edit truck/bag data, verify bags, change status, hold/complete trucks, view audit, export, manage users.

Do not assume every user has all permissions.

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
View completed loading records
  ↓
Export/print final records
```

1. Authenticate as Management
2. Open today’s operational overview
3. Import or create the daily loading list (trucks start Waiting)
4. Mark trucks **Available** (or Hold / Cancel) — do not set Loading
5. Monitor progress bars and statuses as the floor works
6. Open a truck to review bags and audit events
7. Export/print completed records

### Loading / operational staff (mobile)

```
Login
  ↓
Today's Trucks
  ↓
Select/scan Truck (Available or Loading)
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
3. Select an Available/Loading truck (scan is future)
4. Verify bags (who/when/what recorded); first bag op moves truck to Loading
5. Record authorized modifications with reason when required
6. Mark truck completed when appropriate

## Cross-cutting rules

| Concern | Rule |
|---------|------|
| Authentication | Supabase Auth; authenticated internal users only |
| Authorization | Server-side + RLS; TODO: role matrix |
| Tenancy | Internal company system; multi-org TBD |
| Notifications | TODO: define when known |
| Auditability | Important changes and status transitions create immutable audit events (from normal UI) |
| Error handling | Clear operational errors; no secret leakage |
| Realtime | Desktop and mobile share one DB; updates visible without file exchange |
| Offline | Important future consideration; not V1 requirement |
| Import | Excel/CSV liste de colisage multi-file; Append or Replace; see import-format.md |
| Market | DRC only |
| Languages | Mandarin, English, and French — TODO: default language and switch UX |
