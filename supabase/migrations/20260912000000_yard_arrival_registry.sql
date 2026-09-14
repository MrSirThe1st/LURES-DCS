-- Yard arrival registry: a truck may exist before a packing list or program day.
-- loading_list_id stays the assignment to a loading date; null = in the yard, not programmed.

alter table public.trucks
  alter column loading_list_id drop not null;

alter table public.trucks
  add column if not exists arrived_at timestamptz,
  add column if not exists driver_phone text,
  add column if not exists client_name text;

comment on column public.trucks.arrived_at is
  'When the truck was registered at the yard. Outside the gates is allowed. Null for legacy import-created trucks.';

comment on column public.trucks.driver_phone is
  'Driver phone for call-up. No automated SMS in this slice.';

comment on column public.trucks.client_name is
  'Client/buyer this arrival is for, independent of the daily loading list.';

alter table public.trucks
  drop constraint if exists trucks_loading_list_id_vehicle_registration_key;

create unique index if not exists trucks_list_vehicle_registration_uidx
  on public.trucks (loading_list_id, vehicle_registration)
  where loading_list_id is not null;

-- One open trip per plate (completed/cancelled trips may return later).
create unique index if not exists trucks_open_vehicle_registration_uidx
  on public.trucks (upper(btrim(vehicle_registration)))
  where status not in ('completed', 'cancelled');
