-- Add available status for management-released trucks (mobile work may begin).

do $$ begin
  alter type public.truck_status add value if not exists 'available' after 'waiting';
exception
  when duplicate_object then null;
end $$;
