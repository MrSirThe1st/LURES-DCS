-- Loading Order header truck counts (ALLOCATION / BALANCE) and source spreadsheet
-- fill colour on the TRUCK cell. Colour meaning is unknown; store, do not interpret.

alter table public.pre_alerts
  add column if not exists allocation_truck_count integer,
  add column if not exists balance_truck_count integer;

comment on column public.pre_alerts.allocation_truck_count is
  'TRUCKS figure on the ALLOCATION row of the Loading Order header.';
comment on column public.pre_alerts.balance_truck_count is
  'TRUCKS figure on the BALANCE row of the Loading Order header.';

alter table public.trucks
  add column if not exists source_highlight text;

alter table public.pre_alert_lines
  add column if not exists source_highlight text;

comment on column public.trucks.source_highlight is
  'Fill colour (#RRGGBB) of the TRUCK cell on the source Loading Order. Not a system status.';
comment on column public.pre_alert_lines.source_highlight is
  'Fill colour (#RRGGBB) of the TRUCK cell on the source Loading Order. Not a system status.';
