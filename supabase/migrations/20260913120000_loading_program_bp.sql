-- Phase 2: loading_lists is the Loading Program / BP.
-- packing_list_number on the list row was the overloaded bulletin field.

alter table public.loading_lists
  rename column packing_list_number to bulletin_number;

alter table public.loading_lists
  add column if not exists program_code text,
  add column if not exists original_filename text,
  add column if not exists storage_path text;

comment on table public.loading_lists is
  'Loading Program / BP (bulletin de pesage). Not a per-truck packing list.';

comment on column public.loading_lists.bulletin_number is
  'Full bulletin identity e.g. LU-EX Conc.-2026-9-11-049. Distinct from trucks.packing_list_number (EXLOT).';

comment on column public.loading_lists.program_code is
  'Informal code e.g. BP049. Display only; matching uses horse plate, not this code.';

create unique index if not exists loading_lists_bulletin_number_uidx
  on public.loading_lists (bulletin_number)
  where bulletin_number is not null;
