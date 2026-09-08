-- Core operational schema for LURES-DCS V1 foundation.
-- Entities follow PROJECT_KNOWLEDGE.md (conceptual, not locked to paper layout).

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('management', 'loading_staff');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.truck_status as enum (
    'waiting',
    'loading',
    'completed',
    'on_hold',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.bag_verification_status as enum (
    'pending',
    'verified',
    'modified'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.loading_list_status as enum (
    'draft',
    'active',
    'closed'
  );
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Helpers (generic)
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  display_name text not null,
  preferred_locale text not null default 'en'
    check (preferred_locale in ('en', 'fr', 'zh')),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- Role helpers (after profiles exists)
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.is_management()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'management'
  );
$$;

create or replace function public.is_authenticated_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.profiles
      where id = auth.uid()
    );
$$;

-- ---------------------------------------------------------------------------
-- loading_lists
-- ---------------------------------------------------------------------------
create table if not exists public.loading_lists (
  id uuid primary key default gen_random_uuid(),
  loading_date date not null,
  packing_list_number text,
  cargo_description text,
  status public.loading_list_status not null default 'active',
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists loading_lists_loading_date_idx
  on public.loading_lists (loading_date desc);

drop trigger if exists loading_lists_set_updated_at on public.loading_lists;
create trigger loading_lists_set_updated_at
before update on public.loading_lists
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- trucks
-- ---------------------------------------------------------------------------
create table if not exists public.trucks (
  id uuid primary key default gen_random_uuid(),
  loading_list_id uuid not null references public.loading_lists (id) on delete cascade,
  vehicle_registration text not null,
  trailer_registration text,
  driver_name text,
  driver_passport_reference text,
  transporter_name text,
  loading_location text,
  transit_info text,
  border text,
  agent text,
  packing_list_number text,
  cargo_description text,
  status public.truck_status not null default 'waiting',
  notes text,
  completed_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (loading_list_id, vehicle_registration)
);

create index if not exists trucks_loading_list_id_idx on public.trucks (loading_list_id);
create index if not exists trucks_status_idx on public.trucks (status);
create index if not exists trucks_vehicle_registration_idx on public.trucks (vehicle_registration);

drop trigger if exists trucks_set_updated_at on public.trucks;
create trigger trucks_set_updated_at
before update on public.trucks
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- bags
-- ---------------------------------------------------------------------------
create table if not exists public.bags (
  id uuid primary key default gen_random_uuid(),
  truck_id uuid not null references public.trucks (id) on delete cascade,
  bag_number text not null,
  net_weight_kg numeric(12, 3) not null check (net_weight_kg >= 0),
  seal_number text,
  sort_order integer not null default 0,
  verification_status public.bag_verification_status not null default 'pending',
  verified_at timestamptz,
  verified_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (truck_id, bag_number)
);

create index if not exists bags_truck_id_idx on public.bags (truck_id);
create index if not exists bags_verification_status_idx on public.bags (verification_status);

drop trigger if exists bags_set_updated_at on public.bags;
create trigger bags_set_updated_at
before update on public.bags
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- audit_events (immutable from normal app paths)
-- ---------------------------------------------------------------------------
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  truck_id uuid references public.trucks (id) on delete set null,
  bag_id uuid references public.bags (id) on delete set null,
  action text not null,
  field_name text,
  previous_value text,
  new_value text,
  reason text,
  actor_id uuid references public.profiles (id),
  actor_display_name text,
  occurred_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists audit_events_truck_id_idx on public.audit_events (truck_id, occurred_at desc);
create index if not exists audit_events_entity_idx on public.audit_events (entity_type, entity_id, occurred_at desc);
create index if not exists audit_events_occurred_at_idx on public.audit_events (occurred_at desc);

create or replace function public.deny_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_events are immutable';
end;
$$;

drop trigger if exists audit_events_deny_update on public.audit_events;
create trigger audit_events_deny_update
before update on public.audit_events
for each row
execute function public.deny_audit_mutation();

drop trigger if exists audit_events_deny_delete on public.audit_events;
create trigger audit_events_deny_delete
before delete on public.audit_events
for each row
execute function public.deny_audit_mutation();

-- ---------------------------------------------------------------------------
-- Convenience view: truck totals from bags
-- ---------------------------------------------------------------------------
create or replace view public.truck_weight_totals
with (security_invoker = true)
as
select
  t.id as truck_id,
  count(b.id)::integer as bag_count,
  coalesce(sum(b.net_weight_kg), 0)::numeric(14, 3) as total_net_weight_kg
from public.trucks t
left join public.bags b on b.truck_id = t.id
group by t.id;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.loading_lists enable row level security;
alter table public.trucks enable row level security;
alter table public.bags enable row level security;
alter table public.audit_events enable row level security;

-- Drop policies if re-running
drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_management_insert" on public.profiles;
drop policy if exists "profiles_management_update_all" on public.profiles;
drop policy if exists "loading_lists_select_staff" on public.loading_lists;
drop policy if exists "loading_lists_write_management" on public.loading_lists;
drop policy if exists "trucks_select_staff" on public.trucks;
drop policy if exists "trucks_insert_management" on public.trucks;
drop policy if exists "trucks_update_staff" on public.trucks;
drop policy if exists "trucks_delete_management" on public.trucks;
drop policy if exists "bags_select_staff" on public.bags;
drop policy if exists "bags_insert_management" on public.bags;
drop policy if exists "bags_update_staff" on public.bags;
drop policy if exists "bags_delete_management" on public.bags;
drop policy if exists "audit_events_select_staff" on public.audit_events;
drop policy if exists "audit_events_insert_staff" on public.audit_events;

-- profiles
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (public.is_authenticated_staff());

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_management_insert"
  on public.profiles for insert
  to authenticated
  with check (public.is_management());

create policy "profiles_management_update_all"
  on public.profiles for update
  to authenticated
  using (public.is_management())
  with check (public.is_management());

-- loading_lists
create policy "loading_lists_select_staff"
  on public.loading_lists for select
  to authenticated
  using (public.is_authenticated_staff());

create policy "loading_lists_write_management"
  on public.loading_lists for all
  to authenticated
  using (public.is_management())
  with check (public.is_management());

-- trucks
create policy "trucks_select_staff"
  on public.trucks for select
  to authenticated
  using (public.is_authenticated_staff());

create policy "trucks_insert_management"
  on public.trucks for insert
  to authenticated
  with check (public.is_management());

create policy "trucks_update_staff"
  on public.trucks for update
  to authenticated
  using (public.is_authenticated_staff())
  with check (public.is_authenticated_staff());

create policy "trucks_delete_management"
  on public.trucks for delete
  to authenticated
  using (public.is_management());

-- bags
create policy "bags_select_staff"
  on public.bags for select
  to authenticated
  using (public.is_authenticated_staff());

create policy "bags_insert_management"
  on public.bags for insert
  to authenticated
  with check (public.is_management());

create policy "bags_update_staff"
  on public.bags for update
  to authenticated
  using (public.is_authenticated_staff())
  with check (public.is_authenticated_staff());

create policy "bags_delete_management"
  on public.bags for delete
  to authenticated
  using (public.is_management());

-- audit_events
create policy "audit_events_select_staff"
  on public.audit_events for select
  to authenticated
  using (public.is_authenticated_staff());

create policy "audit_events_insert_staff"
  on public.audit_events for insert
  to authenticated
  with check (
    public.is_authenticated_staff()
    and actor_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.loading_lists;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.trucks;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.bags;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.audit_events;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant insert on public.profiles to authenticated;
grant select, insert, update, delete on public.loading_lists to authenticated;
grant select, insert, update, delete on public.trucks to authenticated;
grant select, insert, update, delete on public.bags to authenticated;
grant select, insert on public.audit_events to authenticated;
grant select on public.truck_weight_totals to authenticated;
