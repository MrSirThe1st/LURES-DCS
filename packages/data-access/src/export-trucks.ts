import { calculateTruckTotalWeightKg } from '@lures-dcs/domain';
import type { ExportTruckRecord } from '@lures-dcs/api-contracts';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from './database.types.js';

export type ExportActor = Pick<Tables<'profiles'>, 'id' | 'display_name'>;

export type FetchTrucksForExportInput = {
  client: SupabaseClient<Database>;
  truckIds: readonly string[];
};

export type RecordTruckExportAuditInput = {
  client: SupabaseClient<Database>;
  records: readonly ExportTruckRecord[];
  actor: ExportActor;
};

/**
 * Load truck + bag rows for PDF export, ordered for stable multi-page output.
 */
export async function fetchTrucksForExport(
  input: FetchTrucksForExportInput,
): Promise<ExportTruckRecord[]> {
  const ids = [...new Set(input.truckIds.filter(Boolean))];
  if (ids.length === 0) return [];

  const { data: trucks, error: truckError } = await input.client
    .from('trucks')
    .select(
      `
      id,
      status,
      vehicle_registration,
      trailer_registration,
      trailer_registration_2,
      driver_name,
      driver_passport_reference,
      transporter_name,
      loading_location,
      transit_info,
      border,
      agent,
      packing_list_number,
      cargo_description,
      loading_list_id
    `,
    )
    .in('id', ids);

  if (truckError) throw truckError;
  if (!trucks || trucks.length === 0) return [];

  const truckIds = trucks.map((truck) => truck.id);
  const listIds = [
    ...new Set(
      trucks
        .map((truck) => truck.loading_list_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [bagsResult, listsResult] = await Promise.all([
    input.client
      .from('bags')
      .select('id, truck_id, bag_number, net_weight_kg, seal_number, sort_order, verification_status')
      .in('truck_id', truckIds)
      .order('sort_order', { ascending: true })
      .order('bag_number', { ascending: true }),
    listIds.length > 0
      ? input.client.from('loading_lists').select('id, loading_date').in('id', listIds)
      : Promise.resolve({ data: [] as Array<{ id: string; loading_date: string }>, error: null }),
  ]);

  if (bagsResult.error) throw bagsResult.error;
  if (listsResult.error) throw listsResult.error;

  const bagsByTruck = new Map<string, NonNullable<typeof bagsResult.data>>();
  for (const bag of bagsResult.data ?? []) {
    const list = bagsByTruck.get(bag.truck_id) ?? [];
    list.push(bag);
    bagsByTruck.set(bag.truck_id, list);
  }

  const dateByList = new Map((listsResult.data ?? []).map((list) => [list.id, list.loading_date]));
  const order = new Map(ids.map((id, index) => [id, index]));

  return trucks
    .slice()
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    .map((truck) => {
      const bags = (bagsByTruck.get(truck.id) ?? []).map((bag) => ({
        id: bag.id,
        bag_number: bag.bag_number,
        net_weight_kg: Number(bag.net_weight_kg),
        seal_number: bag.seal_number,
        sort_order: bag.sort_order,
        verification_status: bag.verification_status,
      }));

      return {
        id: truck.id,
        status: truck.status,
        vehicle_registration: truck.vehicle_registration,
        trailer_registration: truck.trailer_registration,
        trailer_registration_2: truck.trailer_registration_2,
        driver_name: truck.driver_name,
        driver_passport_reference: truck.driver_passport_reference,
        transporter_name: truck.transporter_name,
        loading_location: truck.loading_location,
        transit_info: truck.transit_info,
        border: truck.border,
        agent: truck.agent,
        packing_list_number: truck.packing_list_number,
        cargo_description: truck.cargo_description,
        loading_date: truck.loading_list_id
          ? (dateByList.get(truck.loading_list_id) ?? null)
          : null,
        total_net_weight_kg: calculateTruckTotalWeightKg(bags.map((bag) => bag.net_weight_kg)),
        bags,
      };
    });
}

/**
 * Record an immutable audit event per exported truck (PDF).
 */
export async function recordTruckExportAudit(input: RecordTruckExportAuditInput): Promise<void> {
  if (input.records.length === 0) return;

  const rows = input.records.map((record) => ({
    entity_type: 'truck',
    entity_id: record.id,
    truck_id: record.id,
    action: 'exported',
    field_name: null,
    previous_value: null,
    new_value: 'pdf',
    reason: null,
    actor_id: input.actor.id,
    actor_display_name: input.actor.display_name,
    metadata: {
      format: 'pdf',
      status: record.status,
      packing_list_number: record.packing_list_number,
      vehicle_registration: record.vehicle_registration,
      bag_count: record.bags.length,
      total_net_weight_kg: record.total_net_weight_kg,
    },
  }));

  const { error } = await input.client.from('audit_events').insert(rows);
  if (error) throw error;
}
