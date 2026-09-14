-- Phase 1: pre-alerts / Loading Orders, expected trips, arrival confirmation.
-- Physical vehicle identity is separate from an operational trip.
-- loading_lists remains the Loading Program / BP (Phase 2); do not collapse it with packing lists.
-- Source labels (transporter, client, driver, locations) are stored exactly as supplied.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.arrival_status as enum (
    'expected',
    'arrived',
    'cancelled',
    'did_not_arrive'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.pre_alert_status as enum (
    'draft',
    'active',
    'closed',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Physical vehicles (identity). Trip rows keep source-spelling snapshots.
-- ---------------------------------------------------------------------------
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  registration text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists vehicles_registration_uidx
  on public.vehicles (upper(btrim(registration)));

drop trigger if exists vehicles_set_updated_at on public.vehicles;
create trigger vehicles_set_updated_at
before update on public.vehicles
for each row
execute function public.set_updated_at();

-- Optional later linking of different labels for the same org.
-- Matching MUST NOT use this table. Match operational trips by horse plate.
create table if not exists public.organization_name_aliases (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('transporter', 'client')),
  name_a text not null,
  name_b text not null,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  unique (kind, name_a, name_b)
);

-- Client/company representatives or checkers (no login role yet).
-- Optional profile_id when a representative later receives an account.
create table if not exists public.external_persons (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  display_name text not null,
  role_label text,
  profile_id uuid references public.profiles (id),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists external_persons_set_updated_at on public.external_persons;
create trigger external_persons_set_updated_at
before update on public.external_persons
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Pre-alerts / Loading Orders
-- ---------------------------------------------------------------------------
create table if not exists public.pre_alerts (
  id uuid primary key default gen_random_uuid(),
  status public.pre_alert_status not null default 'draft',
  client_name text,
  loading_point text,
  offloading_point text,
  period_month text,
  allocation_mt numeric(14, 3),
  booked_mt numeric(14, 3),
  balance_mt numeric(14, 3),
  booked_truck_count integer,
  original_filename text,
  storage_path text,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists pre_alerts_status_idx on public.pre_alerts (status, created_at desc);

drop trigger if exists pre_alerts_set_updated_at on public.pre_alerts;
create trigger pre_alerts_set_updated_at
before update on public.pre_alerts
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Truck / trip extensions
-- ---------------------------------------------------------------------------
alter table public.trucks
  add column if not exists arrival_status public.arrival_status,
  add column if not exists unplanned boolean not null default false,
  add column if not exists arrived_by uuid references public.profiles (id),
  add column if not exists pre_alert_id uuid references public.pre_alerts (id) on delete set null,
  add column if not exists horse_vehicle_id uuid references public.vehicles (id),
  add column if not exists trailer_vehicle_id uuid references public.vehicles (id),
  add column if not exists trailer2_vehicle_id uuid references public.vehicles (id),
  add column if not exists eta_to_mine date,
  add column if not exists on_site boolean not null default false,
  add column if not exists planned_tonnage numeric(12, 3),
  add column if not exists final_destination text,
  add column if not exists program_sequence integer,
  add column if not exists loading_started_at timestamptz,
  add column if not exists package_count integer,
  add column if not exists gross_weight_t numeric(14, 3),
  add column if not exists net_weight_t numeric(14, 3),
  add column if not exists field_sources jsonb not null default '{}'::jsonb,
  add column if not exists information_verified_by_person_id uuid references public.external_persons (id);

comment on column public.trucks.arrival_status is
  'Expected / arrived / cancelled / did_not_arrive. Independent of floor truck_status.';
comment on column public.trucks.unplanned is
  'True when registered without a pre-alert (UNPLANNED / NOT ON PRE-ALERT).';
comment on column public.trucks.field_sources is
  'Map of field name → pre_alert | yard | bp | packing_list | manual. Yard-sourced fields must not be silently overwritten by BP.';
comment on column public.trucks.program_sequence is
  'Order on the Loading Program / BP. Independent of arrival order and loading_started_at.';
comment on column public.trucks.loading_started_at is
  'When floor loading actually started. Independent of arrived_at and program_sequence.';
comment on column public.loading_lists.packing_list_number is
  'Loading Program / BP bulletin number (e.g. LU-EX Conc.-2026-9-11-049). Not a per-truck packing list. Per-truck EXLOT remains trucks.packing_list_number.';

-- Legacy rows were created as present (import or yard), never as expected.
update public.trucks
set arrival_status = case
  when status in ('cancelled') then 'cancelled'::public.arrival_status
  when arrived_at is not null then 'arrived'::public.arrival_status
  else 'arrived'::public.arrival_status
end
where arrival_status is null;

alter table public.trucks
  alter column arrival_status set default 'expected',
  alter column arrival_status set not null;

create table if not exists public.pre_alert_lines (
  id uuid primary key default gen_random_uuid(),
  pre_alert_id uuid not null references public.pre_alerts (id) on delete cascade,
  truck_id uuid not null references public.trucks (id) on delete restrict,
  sequence integer,
  transporter_name text,
  vehicle_registration text not null,
  trailer_registration text,
  trailer_registration_2 text,
  driver_name text,
  driver_passport_reference text,
  planned_tonnage numeric(12, 3),
  border text,
  final_destination text,
  eta_to_mine date,
  on_site boolean not null default false,
  eta_raw text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (pre_alert_id, truck_id)
);

create index if not exists pre_alert_lines_pre_alert_id_idx on public.pre_alert_lines (pre_alert_id);
create index if not exists trucks_pre_alert_id_idx on public.trucks (pre_alert_id);
create index if not exists trucks_arrival_status_idx on public.trucks (arrival_status, arrived_at);

drop index if exists public.trucks_open_vehicle_registration_uidx;
create unique index trucks_open_vehicle_registration_uidx
  on public.trucks (upper(btrim(vehicle_registration)))
  where arrival_status in ('expected', 'arrived')
    and status not in ('completed', 'cancelled');

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.vehicles enable row level security;
alter table public.organization_name_aliases enable row level security;
alter table public.external_persons enable row level security;
alter table public.pre_alerts enable row level security;
alter table public.pre_alert_lines enable row level security;

drop policy if exists "vehicles_select_staff" on public.vehicles;
drop policy if exists "vehicles_write_ops" on public.vehicles;
drop policy if exists "org_aliases_select_staff" on public.organization_name_aliases;
drop policy if exists "org_aliases_write_management" on public.organization_name_aliases;
drop policy if exists "external_persons_select_staff" on public.external_persons;
drop policy if exists "external_persons_write_management" on public.external_persons;
drop policy if exists "pre_alerts_select_staff" on public.pre_alerts;
drop policy if exists "pre_alerts_write_management" on public.pre_alerts;
drop policy if exists "pre_alert_lines_select_staff" on public.pre_alert_lines;
drop policy if exists "pre_alert_lines_write_management" on public.pre_alert_lines;

create policy "vehicles_select_staff"
  on public.vehicles for select
  to authenticated
  using (public.is_authenticated_staff());

create policy "vehicles_write_ops"
  on public.vehicles for all
  to authenticated
  using (public.is_management() or public.is_yard_agent())
  with check (public.is_management() or public.is_yard_agent());

create policy "org_aliases_select_staff"
  on public.organization_name_aliases for select
  to authenticated
  using (public.is_authenticated_staff());

create policy "org_aliases_write_management"
  on public.organization_name_aliases for all
  to authenticated
  using (public.is_management())
  with check (public.is_management());

create policy "external_persons_select_staff"
  on public.external_persons for select
  to authenticated
  using (public.is_authenticated_staff());

create policy "external_persons_write_management"
  on public.external_persons for all
  to authenticated
  using (public.is_management())
  with check (public.is_management());

create policy "pre_alerts_select_staff"
  on public.pre_alerts for select
  to authenticated
  using (public.is_authenticated_staff());

create policy "pre_alerts_write_management"
  on public.pre_alerts for all
  to authenticated
  using (public.is_management())
  with check (public.is_management());

create policy "pre_alert_lines_select_staff"
  on public.pre_alert_lines for select
  to authenticated
  using (public.is_authenticated_staff());

create policy "pre_alert_lines_write_management"
  on public.pre_alert_lines for all
  to authenticated
  using (public.is_management())
  with check (public.is_management());

-- Yard may confirm expected arrivals (still unprogrammed, waiting).
drop policy if exists "trucks_update_yard_agent" on public.trucks;
create policy "trucks_update_yard_agent"
  on public.trucks for update
  to authenticated
  using (
    public.is_yard_agent()
    and loading_list_id is null
    and status = 'waiting'
  )
  with check (
    public.is_yard_agent()
    and loading_list_id is null
    and status = 'waiting'
  );

-- Yard unplanned insert: waiting, no program, marked unplanned, arrived.
drop policy if exists "trucks_insert_yard_agent" on public.trucks;
create policy "trucks_insert_yard_agent"
  on public.trucks for insert
  to authenticated
  with check (
    public.is_yard_agent()
    and loading_list_id is null
    and status = 'waiting'
    and arrival_status = 'arrived'
  );

do $$
begin
  alter publication supabase_realtime add table public.pre_alerts;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.pre_alert_lines;
exception when duplicate_object then null;
end $$;

grant select, insert, update, delete on public.vehicles to authenticated;
grant select, insert, update, delete on public.organization_name_aliases to authenticated;
grant select, insert, update, delete on public.external_persons to authenticated;
grant select, insert, update, delete on public.pre_alerts to authenticated;
grant select, insert, update, delete on public.pre_alert_lines to authenticated;

-- Original Loading Order files. Skip quietly if Storage is unavailable.
do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit)
  values ('operational-documents', 'operational-documents', false, 20971520)
  on conflict (id) do nothing;

  execute $pol$
    create policy "operational_documents_select_staff"
      on storage.objects for select
      to authenticated
      using (bucket_id = 'operational-documents' and public.is_authenticated_staff())
  $pol$;
  execute $pol$
    create policy "operational_documents_insert_management"
      on storage.objects for insert
      to authenticated
      with check (bucket_id = 'operational-documents' and public.is_management())
  $pol$;
exception when duplicate_object then
  null;
when others then
  raise notice 'operational-documents storage setup skipped: %', sqlerrm;
end $$;
