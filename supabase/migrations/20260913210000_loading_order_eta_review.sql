alter table public.pre_alert_lines
  add column if not exists eta_review text;

alter table public.pre_alert_lines
  drop constraint if exists pre_alert_lines_eta_review_check;

alter table public.pre_alert_lines
  add constraint pre_alert_lines_eta_review_check
  check (eta_review is null or eta_review in ('kept', 'edited', 'cleared'));

comment on column public.pre_alert_lines.eta_review is
  'Manager decision for an implausible ETA TO MINE: kept as written, edited, or cleared. eta_raw stays the source value.';
