import type { TruckStatus } from '@lures-dcs/domain';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from './database.types.js';

export type HistoryLoadingList = Pick<
  Tables<'loading_lists'>,
  'id' | 'loading_date' | 'packing_list_number' | 'cargo_description' | 'status'
>;

export type HistoryTruckRow = {
  id: string;
  loading_list_id: string;
  vehicle_registration: string;
  trailer_registration: string | null;
  driver_name: string | null;
  transporter_name: string | null;
  status: TruckStatus;
  packing_list_number: string | null;
  cargo_description: string | null;
  bag_count: number;
  total_net_weight_kg: number;
};

export type HistoryDaySnapshot = {
  loadingDate: string;
  lists: HistoryLoadingList[];
  trucks: HistoryTruckRow[];
};

export type AuditHistoryFilters = {
  /** Inclusive start (ISO timestamptz or date `YYYY-MM-DD`). */
  from?: string | null;
  /** Inclusive end (ISO timestamptz or date `YYYY-MM-DD`). */
  to?: string | null;
  action?: string | null;
  actorQuery?: string | null;
  truckId?: string | null;
  limit?: number;
};

export type AuditHistoryRow = Tables<'audit_events'> & {
  vehicle_registration: string | null;
};

function startOfDayIso(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00:00.000Z`;
  return value;
}

function endOfDayIso(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T23:59:59.999Z`;
  return value;
}

/**
 * Distinct loading dates that have lists, newest first.
 */
export async function listHistoryLoadingDates(
  client: SupabaseClient<Database>,
  options: { limit?: number } = {},
): Promise<string[]> {
  const limit = options.limit ?? 120;
  const { data, error } = await client
    .from('loading_lists')
    .select('loading_date')
    .order('loading_date', { ascending: false })
    .limit(Math.max(limit * 3, 60));

  if (error) throw error;

  const dates: string[] = [];
  const seen = new Set<string>();
  for (const row of data ?? []) {
    if (seen.has(row.loading_date)) continue;
    seen.add(row.loading_date);
    dates.push(row.loading_date);
    if (dates.length >= limit) break;
  }
  return dates;
}

/**
 * Loading lists + trucks for one operational day.
 */
export async function fetchHistoryDay(
  client: SupabaseClient<Database>,
  loadingDate: string,
): Promise<HistoryDaySnapshot> {
  const { data: lists, error: listError } = await client
    .from('loading_lists')
    .select('id, loading_date, packing_list_number, cargo_description, status')
    .eq('loading_date', loadingDate)
    .order('created_at', { ascending: true });

  if (listError) throw listError;

  const typedLists = (lists ?? []) as HistoryLoadingList[];
  if (typedLists.length === 0) {
    return { loadingDate, lists: [], trucks: [] };
  }

  const listIds = typedLists.map((list) => list.id);
  const { data: truckData, error: truckError } = await client
    .from('trucks')
    .select(
      'id, loading_list_id, vehicle_registration, trailer_registration, driver_name, transporter_name, status, packing_list_number, cargo_description, bags(id, net_weight_kg)',
    )
    .in('loading_list_id', listIds)
    .order('vehicle_registration', { ascending: true });

  if (truckError) throw truckError;

  const trucks: HistoryTruckRow[] = (truckData ?? []).map((truck) => {
    const bags = (truck.bags ?? []) as Array<{ id: string; net_weight_kg: number }>;
    const total = bags.reduce((sum, bag) => sum + Number(bag.net_weight_kg), 0);
    return {
      id: truck.id,
      loading_list_id: truck.loading_list_id,
      vehicle_registration: truck.vehicle_registration,
      trailer_registration: truck.trailer_registration,
      driver_name: truck.driver_name,
      transporter_name: truck.transporter_name,
      status: truck.status as TruckStatus,
      packing_list_number: truck.packing_list_number,
      cargo_description: truck.cargo_description,
      bag_count: bags.length,
      total_net_weight_kg: total,
    };
  });

  return { loadingDate, lists: typedLists, trucks };
}

/**
 * Filterable audit feed for management History.
 */
export async function fetchAuditHistory(
  client: SupabaseClient<Database>,
  filters: AuditHistoryFilters = {},
): Promise<AuditHistoryRow[]> {
  const limit = filters.limit ?? 200;
  let query = client
    .from('audit_events')
    .select(
      'id, entity_type, entity_id, truck_id, bag_id, action, field_name, previous_value, new_value, reason, actor_id, actor_display_name, occurred_at, metadata',
    )
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (filters.from) {
    query = query.gte('occurred_at', startOfDayIso(filters.from));
  }
  if (filters.to) {
    query = query.lte('occurred_at', endOfDayIso(filters.to));
  }
  if (filters.action?.trim()) {
    query = query.eq('action', filters.action.trim());
  }
  if (filters.truckId?.trim()) {
    query = query.eq('truck_id', filters.truckId.trim());
  }
  if (filters.actorQuery?.trim()) {
    query = query.ilike('actor_display_name', `%${filters.actorQuery.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  const events = data ?? [];
  const truckIds = [
    ...new Set(events.map((event) => event.truck_id).filter((id): id is string => Boolean(id))),
  ];

  const plateByTruck = new Map<string, string>();
  if (truckIds.length > 0) {
    const { data: trucks, error: truckError } = await client
      .from('trucks')
      .select('id, vehicle_registration')
      .in('id', truckIds);
    if (truckError) throw truckError;
    for (const truck of trucks ?? []) {
      plateByTruck.set(truck.id, truck.vehicle_registration);
    }
  }

  return events.map((event) => ({
    ...event,
    vehicle_registration: event.truck_id ? (plateByTruck.get(event.truck_id) ?? null) : null,
  }));
}

/** Known audit actions for History filter UI (extend as new actions ship). */
export const KNOWN_AUDIT_ACTIONS = [
  'imported',
  'import',
  'status_changed',
  'exported',
  'bag_verified',
  'weight_changed',
  'seal_changed',
] as const;
