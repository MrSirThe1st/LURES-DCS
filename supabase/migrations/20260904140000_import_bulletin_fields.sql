-- Extend loading_lists / trucks for bulletin + liste de colisage fields.

alter table public.loading_lists
  add column if not exists client_name text,
  add column if not exists destination text,
  add column if not exists customs_agency text,
  add column if not exists license_number text,
  add column if not exists loading_point text;

alter table public.trucks
  add column if not exists trailer_registration_2 text,
  add column if not exists container_number text;

comment on column public.loading_lists.packing_list_number is
  'Bulletin / packing-list bundle reference (e.g. LU-EX Conc.-2026-9-4-044)';

comment on column public.trucks.packing_list_number is
  'Per-truck liste de colisage / LOT NO (e.g. EX202609-0399)';
