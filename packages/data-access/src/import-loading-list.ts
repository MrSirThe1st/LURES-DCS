import type {
  ImportMode,
  ImportPreview,
  ImportResult,
  ImportTruckDraft,
} from '@lures-dcs/api-contracts';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from './database.types.js';

export type ImportActor = Pick<Tables<'profiles'>, 'id' | 'display_name'>;

export type ImportLoadingListBundleInput = {
  client: SupabaseClient<Database>;
  preview: ImportPreview;
  mode: ImportMode;
  actor: ImportActor;
  /** Optional bulletin / packing-list bundle reference for the loading_lists row. */
  bulletinReference?: string | null;
  cargoDescription?: string | null;
};

function truckInsertFromDraft(
  draft: ImportTruckDraft,
  loadingListId: string,
  actorId: string,
): Database['public']['Tables']['trucks']['Insert'] {
  return {
    loading_list_id: loadingListId,
    vehicle_registration: draft.vehicle_registration.trim(),
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
    status: 'waiting',
    created_by: actorId,
  };
}

/**
 * Persist a validated import preview as a day's packing-list bundle.
 * Append adds trucks; replace clears existing trucks on that date's active list first.
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
    .select('id, packing_list_number')
    .eq('loading_date', loadingDate)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (listLookupError) throw listLookupError;

  let loadingListId = existingLists?.[0]?.id ?? null;
  let trucksRemoved = 0;

  if (!loadingListId) {
    const { data: created, error: createError } = await client
      .from('loading_lists')
      .insert({
        loading_date: loadingDate,
        packing_list_number: input.bulletinReference ?? null,
        cargo_description: cargoDescription,
        status: 'active',
        created_by: actor.id,
      })
      .select('id')
      .single();
    if (createError) throw createError;
    loadingListId = created.id;
  } else if (input.bulletinReference || cargoDescription) {
    const patch: Database['public']['Tables']['loading_lists']['Update'] = {};
    if (input.bulletinReference) patch.packing_list_number = input.bulletinReference;
    if (cargoDescription) patch.cargo_description = cargoDescription;
    const { error: updateListError } = await client
      .from('loading_lists')
      .update(patch)
      .eq('id', loadingListId);
    if (updateListError) throw updateListError;
  }

  if (mode === 'replace') {
    const { data: existingTrucks, error: existingTrucksError } = await client
      .from('trucks')
      .select('id')
      .eq('loading_list_id', loadingListId);
    if (existingTrucksError) throw existingTrucksError;
    trucksRemoved = existingTrucks?.length ?? 0;
    if (trucksRemoved > 0) {
      const { error: deleteError } = await client
        .from('trucks')
        .delete()
        .eq('loading_list_id', loadingListId);
      if (deleteError) throw deleteError;
    }
  } else {
    const vehicleRegs = preview.trucks.map((t) => t.vehicle_registration.trim().toUpperCase());
    const { data: conflicts, error: conflictError } = await client
      .from('trucks')
      .select('id, vehicle_registration, packing_list_number')
      .eq('loading_list_id', loadingListId);
    if (conflictError) throw conflictError;

    for (const existing of conflicts ?? []) {
      const reg = existing.vehicle_registration.trim().toUpperCase();
      if (vehicleRegs.includes(reg)) {
        throw new Error(
          `Vehicle ${existing.vehicle_registration} already exists on today’s list. Use Replace, or remove it first.`,
        );
      }
      const lot = existing.packing_list_number?.trim().toUpperCase();
      if (lot) {
        const incomingLot = preview.trucks.find(
          (t) => t.packing_list_number?.trim().toUpperCase() === lot,
        );
        if (incomingLot) {
          throw new Error(
            `Lot ${existing.packing_list_number} already exists on today’s list. Use Replace, or remove it first.`,
          );
        }
      }
    }
  }

  let trucksCreated = 0;
  let bagsCreated = 0;

  for (const truckPreview of preview.trucks) {
    const draft = truckPreview.draft;
    const { data: truck, error: truckError } = await client
      .from('trucks')
      .insert(truckInsertFromDraft(draft, loadingListId, actor.id))
      .select('id')
      .single();
    if (truckError) throw truckError;

    trucksCreated += 1;

    const bagRows = draft.bags.map((bag, index) => ({
      truck_id: truck.id,
      bag_number: bag.bag_number,
      net_weight_kg: bag.net_weight_kg,
      seal_number: bag.seal_number ?? null,
      sort_order: bag.sort_order ?? index + 1,
      verification_status: 'pending' as const,
    }));

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
  };
}
