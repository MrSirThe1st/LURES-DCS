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
Daily Loading Dashboard
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

1. Authenticate as Management
2. Open today’s operational dashboard
3. Import or create the daily loading list
4. Monitor truck statuses and totals
5. Open a truck to review bags and audit events
6. Make authorized edits when needed
7. Export/print completed records

### Loading / operational staff (mobile)

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

1. Authenticate as loading staff
2. Open today’s truck list
3. Select the correct truck (scan is future)
4. Verify bags (who/when/what recorded)
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
| Realtime | Management and mobile share one DB; updates visible without file exchange |
| Offline | Important future consideration; not V1 requirement |
| Import | Excel/CSV validation before write; format TBD |
| Market | DRC only |
| Languages | Mandarin, English, and French — TODO: default language and switch UX |
