-- Enable reliable Realtime filters on non-PK columns (e.g. bags.truck_id).
alter table public.loading_lists replica identity full;
alter table public.trucks replica identity full;
alter table public.bags replica identity full;
alter table public.audit_events replica identity full;
