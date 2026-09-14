import type {
  ImportMode,
  ImportPreview,
  ImportResult,
  ImportTruckDraft,
} from '@lures-dcs/api-contracts';
import { normalizeVehicleRegistration } from '@lures-dcs/domain';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from './database.types.js';

export type ImportActor = Pick<Tables<'profiles'>, 'id' | 'display_name'>;

export type ImportLoadingListBundleInput = {
  client: SupabaseClient<Database>;
  preview: ImportPreview;
  mode: ImportMode;
  actor: ImportActor;
  /** Unused. BP identity comes from Loading Program / BP import, not packing-list upload. */
  bulletinReference?: string | null;
  cargoDescription?: string | null;
};

type OpenTruck = {
  id: string;
  vehicle_registration: string;
  loading_list_id: string | null;
  status: Database['public']['Enums']['truck_status'];
};

function packingListPatchFromDraft(
  draft: ImportTruckDraft,
): Database['public']['Tables']['trucks']['Update'] {
  return {
    trailer_registration: draft.trailer_registration ?? null,
    trailer_registration_2: draft.trailer_registration_2 ?? null,
    container_number: draft.container_number ?? null,
    driver_name: draft.driver_name ?? null,
    driver_passport_reference: draft.driver_passport_reference ?? null,
    transporter_name: draft.transporter_name ?? null,
    loading_location: draft.loading_location ?? null,
    transit_info: draft.transit_info ?? null,
    border: draft.border ?? null,
    agent: draft.agent ?? null,
    packing_list_number: draft.packing_list_number ?? null,
    cargo_description: draft.cargo_description ?? null,
  };
}

function truckInsertFromDraft(
  draft: ImportTruckDraft,
  loadingListId: string,
  actorId: string,
): Database['public']['Tables']['trucks']['Insert'] {
  return {
    loading_list_id: loadingListId,
    vehicle_registration: normalizeVehicleRegistration(draft.vehicle_registration),
    ...packingListPatchFromDraft(draft),
    status: 'waiting',
    created_by: actorId,
  };
}

function bagInserts(draft: ImportTruckDraft, truckId: string) {
  return draft.bags.map((bag, index) => ({
    truck_id: truckId,
    bag_number: bag.bag_number,
    net_weight_kg: bag.net_weight_kg,
    seal_number: bag.seal_number ?? null,
    sort_order: bag.sort_order ?? index + 1,
    verification_status: 'pending' as const,
  }));
}

/**
 * Persist a validated import preview as packing lists for a loading date.
 * Matches existing yard/program trucks by plate and attaches bags.
 * Creates a truck only when that plate is not already open.
 * Replace updates pending bags on waiting trucks — it does not delete yard records.
 */
export async function importLoadingListBundle(
  input: ImportLoadingListBundleInput,
): Promise<ImportResult> {
  const { client, preview, mode, actor } = input;

  if (preview.has_errors) {
    throw new Error('Cannot import while the preview has validation errors.');
  }
  if (preview.trucks.length === 0) {
    throw new Error('Nothing to import.');
  }

  const loadingDate = preview.loading_date;
  const cargoDescription =
    input.cargoDescription ??
    preview.trucks.find((t) => t.draft.cargo_description)?.draft.cargo_description ??
    null;

  const { data: existingLists, error: listLookupError } = await client
    .from('loading_lists')
    .select('id, bulletin_number')
    .eq('loading_date', loadingDate)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (listLookupError) throw listLookupError;

  const bpList = (existingLists ?? []).find((row) => row.bulletin_number);
  let loadingListId = bpList?.id ?? existingLists?.[0]?.id ?? null;

  if (!loadingListId) {
    const { data: created, error: createError } = await client
      .from('loading_lists')
      .insert({
        loading_date: loadingDate,
        cargo_description: cargoDescription,
        status: 'active',
        created_by: actor.id,
      })
      .select('id')
      .single();
    if (createError) throw createError;
    loadingListId = created.id;
  } else if (cargoDescription && !bpList) {
    const { error: updateListError } = await client
      .from('loading_lists')
      .update({ cargo_description: cargoDescription })
      .eq('id', loadingListId);
    if (updateListError) throw updateListError;
  }

  const { data: openRows, error: openError } = await client
    .from('trucks')
    .select('id, vehicle_registration, loading_list_id, status')
    .in('status', ['waiting', 'available', 'loading', 'on_hold']);
  if (openError) throw openError;

  const openByPlate = new Map<string, OpenTruck>();
  for (const row of openRows ?? []) {
    openByPlate.set(normalizeVehicleRegistration(row.vehicle_registration), row);
  }

  let trucksCreated = 0;
  let trucksAttached = 0;
  let bagsCreated = 0;
  const trucksRemoved = 0;

  for (const truckPreview of preview.trucks) {
    const draft = truckPreview.draft;
    const plate = normalizeVehicleRegistration(draft.vehicle_registration);
    const existing = openByPlate.get(plate);

    if (existing) {
      if (existing.loading_list_id && existing.loading_list_id !== loadingListId) {
        throw new Error(
          `Vehicle ${draft.vehicle_registration} is already on another loading day. Return it to the yard first.`,
        );
      }
      if (existing.status !== 'waiting' && existing.status !== 'on_hold') {
        throw new Error(
          `Vehicle ${draft.vehicle_registration} is ${existing.status} and cannot receive a new packing list.`,
        );
      }

      const { data: existingBags, error: bagsLookupError } = await client
        .from('bags')
        .select('id, verification_status')
        .eq('truck_id', existing.id);
      if (bagsLookupError) throw bagsLookupError;

      const hasBags = (existingBags?.length ?? 0) > 0;
      const hasVerified = (existingBags ?? []).some((bag) => bag.verification_status !== 'pending');

      if (hasBags && hasVerified) {
        throw new Error(
          `Vehicle ${draft.vehicle_registration} already has verified bags. Cannot replace the packing list.`,
        );
      }
      if (hasBags && mode !== 'replace') {
        throw new Error(
          `Vehicle ${draft.vehicle_registration} already has a packing list. Use Replace to update pending bags.`,
        );
      }
      if (hasBags && mode === 'replace') {
        const { error: deleteBagsError } = await client.from('bags').delete().eq('truck_id', existing.id);
        if (deleteBagsError) throw deleteBagsError;
      }

      const { error: updateTruckError } = await client
        .from('trucks')
        .update({
          ...packingListPatchFromDraft(draft),
          loading_list_id: existing.loading_list_id ?? loadingListId,
        })
        .eq('id', existing.id);
      if (updateTruckError) throw updateTruckError;

      const bagRows = bagInserts(draft, existing.id);
      const { error: bagsError } = await client.from('bags').insert(bagRows);
      if (bagsError) throw bagsError;
      bagsCreated += bagRows.length;
      trucksAttached += 1;

      const { error: truckAuditError } = await client.from('audit_events').insert({
        entity_type: 'truck',
        entity_id: existing.id,
        truck_id: existing.id,
        action: 'packing_list_attached',
        actor_id: actor.id,
        actor_display_name: actor.display_name,
        metadata: {
          source_file: draft.source_file ?? null,
          packing_list_number: draft.packing_list_number ?? null,
          bag_count: bagRows.length,
          mode,
        },
      });
      if (truckAuditError) throw truckAuditError;
      continue;
    }

    const { data: truck, error: truckError } = await client
      .from('trucks')
      .insert(truckInsertFromDraft(draft, loadingListId, actor.id))
      .select('id')
      .single();
    if (truckError) throw truckError;

    trucksCreated += 1;
    openByPlate.set(plate, {
      id: truck.id,
      vehicle_registration: plate,
      loading_list_id: loadingListId,
      status: 'waiting',
    });

    const bagRows = bagInserts(draft, truck.id);
    const { error: bagsError } = await client.from('bags').insert(bagRows);
    if (bagsError) throw bagsError;
    bagsCreated += bagRows.length;

    const { error: truckAuditError } = await client.from('audit_events').insert({
      entity_type: 'truck',
      entity_id: truck.id,
      truck_id: truck.id,
      action: 'imported',
      actor_id: actor.id,
      actor_display_name: actor.display_name,
      metadata: {
        source_file: draft.source_file ?? null,
        packing_list_number: draft.packing_list_number ?? null,
        bag_count: bagRows.length,
        mode,
      },
    });
    if (truckAuditError) throw truckAuditError;
  }

  const { error: listAuditError } = await client.from('audit_events').insert({
    entity_type: 'loading_list',
    entity_id: loadingListId,
    action: 'import',
    actor_id: actor.id,
    actor_display_name: actor.display_name,
    metadata: {
      mode,
      loading_date: loadingDate,
      trucks_created: trucksCreated,
      trucks_attached: trucksAttached,
      bags_created: bagsCreated,
      trucks_removed: trucksRemoved,
      source_files: preview.trucks
        .map((t) => t.source_file)
        .filter((f): f is string => Boolean(f)),
    },
  });
  if (listAuditError) throw listAuditError;

  return {
    loading_list_id: loadingListId,
    mode,
    trucks_created: trucksCreated,
    bags_created: bagsCreated,
    trucks_removed: trucksRemoved,
    trucks_attached: trucksAttached,
  };
}
