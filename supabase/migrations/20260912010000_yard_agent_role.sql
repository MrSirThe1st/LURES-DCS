-- Yard arrivals are recorded by a phone agent, not loading-floor staff and not desktop.

alter type public.user_role add value if not exists 'yard_agent';

create or replace function public.is_yard_agent()
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
      and role::text = 'yard_agent'
  );
$$;

create or replace function public.is_loading_staff()
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
      and role = 'loading_staff'
  );
$$;

drop policy if exists "trucks_insert_management" on public.trucks;
drop policy if exists "trucks_insert_yard_agent" on public.trucks;
drop policy if exists "trucks_update_staff" on public.trucks;
drop policy if exists "trucks_update_management" on public.trucks;
drop policy if exists "trucks_update_loading_staff" on public.trucks;
drop policy if exists "trucks_update_yard_agent" on public.trucks;
drop policy if exists "bags_update_staff" on public.bags;
drop policy if exists "bags_update_operations" on public.bags;

create policy "trucks_insert_management"
  on public.trucks for insert
  to authenticated
  with check (public.is_management());

create policy "trucks_insert_yard_agent"
  on public.trucks for insert
  to authenticated
  with check (
    public.is_yard_agent()
    and loading_list_id is null
    and status = 'waiting'
  );

create policy "trucks_update_management"
  on public.trucks for update
  to authenticated
  using (public.is_management())
  with check (public.is_management());

create policy "trucks_update_loading_staff"
  on public.trucks for update
  to authenticated
  using (public.is_loading_staff())
  with check (public.is_loading_staff());

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

create policy "bags_update_operations"
  on public.bags for update
  to authenticated
  using (public.is_management() or public.is_loading_staff())
  with check (public.is_management() or public.is_loading_staff());
