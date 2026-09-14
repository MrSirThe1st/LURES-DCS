import {
  importLoadingProgramSchema,
  type BulletinConflictResolution,
  type BulletinLineDraft,
  type BulletinPreview,
} from '@lures-dcs/api-contracts';
import {
  ArrivalStatus,
  BP_CONFLICT_FIELDS,
  FieldSource,
  TruckStatus,
  UserRole,
  normalizeVehicleRegistration,
  resolveBpFieldUpdate,
  type FieldSources,
} from '@lures-dcs/domain';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json, Tables } from './database.types.js';
import { ensureVehicle, mergeFieldSources } from './pre-alerts.js';

export type LoadingProgramActor = Pick<Tables<'profiles'>, 'id' | 'display_name'>;

export type BulletinMatchStatus = 'arrived' | 'expected' | 'none' | 'other_bp';

export type BulletinFieldConflict = {
  field: string;
  current: string | null;
  incoming: string | null;
  current_source: string | null;
};

export type BulletinMatchLine = {
  draft: BulletinLineDraft;
  truck_id: string | null;
  match: BulletinMatchStatus;
  unplanned: boolean;
  other_bulletin: string | null;
  expected_not_arrived: boolean;
  conflicts: BulletinFieldConflict[];
  applies: BulletinFieldConflict[];
};

export type BulletinImportAnalysis = {
  preview: BulletinPreview;
  lines: BulletinMatchLine[];
  issues: Array<{ severity: 'error' | 'warning'; message: string }>;
  has_errors: boolean;
};

type OpenTrip = Tables<'trucks'> & { list_bulletin_number: string | null };

async function loadOpenTrips(client: SupabaseClient<Database>): Promise<OpenTrip[]> {
  const { data, error } = await client
    .from('trucks')
    .select('*')
    .in('arrival_status', ['expected', 'arrived'])
    .in('status', ['waiting', 'available', 'loading', 'on_hold']);
  if (error) throw error;

  const listIds = [...new Set((data ?? []).map((row) => row.loading_list_id).filter(Boolean))] as string[];
  const bulletinByList = new Map<string, string | null>();
  if (listIds.length > 0) {
    const { data: lists, error: listError } = await client
      .from('loading_lists')
      .select('id, bulletin_number')
      .in('id', listIds);
    if (listError) throw listError;
    for (const list of lists ?? []) bulletinByList.set(list.id, list.bulletin_number);
  }

  return (data ?? []).map((row) => ({
    ...row,
    list_bulletin_number: row.loading_list_id ? (bulletinByList.get(row.loading_list_id) ?? null) : null,
  }));
}

function isUniqueViolation(error: { code?: string }): boolean {
  return error.code === '23505';
}

function asSources(value: Json | FieldSources | null | undefined): FieldSources {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as FieldSources;
}

function textField(truck: Tables<'trucks'>, field: string): string | null {
  const value = truck[field as keyof Tables<'trucks'>];
  if (value == null) return null;
  return String(value);
}

function incomingForField(draft: BulletinLineDraft, field: string, clientName: string | null): string | null {
  if (field === 'client_name') return clientName;
  const value = draft[field as keyof BulletinLineDraft];
  if (value == null) return null;
  return String(value);
}

async function assertManagement(client: SupabaseClient<Database>, actorId: string): Promise<void> {
  const { data, error } = await client.from('profiles').select('role').eq('id', actorId).maybeSingle();
  if (error) throw error;
  if (data?.role !== UserRole.Management) {
    throw new Error('Only management can import a Loading Program / BP.');
  }
}

function matchLine(
  draft: BulletinLineDraft,
  open: OpenTrip[],
  clientName: string | null,
  thisBulletin: string | null,
): BulletinMatchLine {
  const plate = normalizeVehicleRegistration(draft.vehicle_registration);
  const truck = open.find(
    (row) => normalizeVehicleRegistration(row.vehicle_registration) === plate,
  );
  if (!truck) {
    return {
      draft,
      truck_id: null,
      match: 'none',
      unplanned: false,
      other_bulletin: null,
      expected_not_arrived: false,
      conflicts: [],
      applies: [],
    };
  }

  const otherBulletin = truck.list_bulletin_number ?? null;
  const onOtherBp = Boolean(otherBulletin && otherBulletin !== thisBulletin);

  const sources = asSources(truck.field_sources);
  const conflicts: BulletinFieldConflict[] = [];
  const applies: BulletinFieldConflict[] = [];
  for (const field of BP_CONFLICT_FIELDS) {
    const current = textField(truck, field);
    const incoming = incomingForField(draft, field, clientName);
    const resolved = resolveBpFieldUpdate({
      field,
      current,
      incoming,
      currentSource: sources[field],
    });
    const row = {
      field,
      current,
      incoming,
      current_source: sources[field] ?? null,
    };
    if (resolved.conflict) conflicts.push(row);
    else if (resolved.applied) applies.push(row);
  }

  return {
    draft,
    truck_id: truck.id,
    match: onOtherBp ? 'other_bp' : truck.arrival_status === ArrivalStatus.Expected ? 'expected' : 'arrived',
    unplanned: truck.unplanned,
    other_bulletin: onOtherBp ? otherBulletin : null,
    expected_not_arrived: truck.arrival_status === ArrivalStatus.Expected,
    conflicts,
    applies,
  };
}

export async function analyzeBulletinImport(input: {
  client: SupabaseClient<Database>;
  preview: BulletinPreview;
}): Promise<BulletinImportAnalysis> {
  const open = await loadOpenTrips(input.client);
  const thisBulletin = input.preview.header.bulletin_number;
  const lines = input.preview.lines.map((line) =>
    matchLine(line.draft, open, input.preview.header.client_name, thisBulletin),
  );

  const issues: BulletinImportAnalysis['issues'] = [...input.preview.issues];
  const lots = new Map<string, string>();
  for (const row of open) {
    const lot = row.packing_list_number?.trim().toUpperCase();
    if (lot) lots.set(lot, row.vehicle_registration);
  }

  for (const line of lines) {
    if (line.match === 'none') {
      issues.push({
        severity: 'warning',
        message: `${line.draft.vehicle_registration} is not an expected or arrived trip. Confirm arrival, or create as unplanned.`,
      });
    }
    if (line.match === 'other_bp') {
      issues.push({
        severity: 'error',
        message: `${line.draft.vehicle_registration} is already on Loading Program ${line.other_bulletin}.`,
      });
    }
    if (line.expected_not_arrived && line.match === 'expected') {
      issues.push({
        severity: 'warning',
        message: `${line.draft.vehicle_registration} is still expected — not yet confirmed at the yard.`,
      });
    }
    const lot = line.draft.packing_list_number?.trim().toUpperCase();
    if (lot) {
      const owner = lots.get(lot);
      const ownerPlate = owner ? normalizeVehicleRegistration(owner) : null;
      const thisPlate = normalizeVehicleRegistration(line.draft.vehicle_registration);
      if (ownerPlate && ownerPlate !== thisPlate) {
        issues.push({
          severity: 'error',
          message: `LOT ${line.draft.packing_list_number} is already on open trip ${owner}.`,
        });
      }
    }
    for (const conflict of line.conflicts) {
      issues.push({
        severity: 'warning',
        message: `${line.draft.vehicle_registration}: yard ${conflict.field} “${conflict.current ?? '—'}” differs from BP “${conflict.incoming ?? '—'}”. Keep yard unless you apply BP.`,
      });
    }
  }

  const has_errors =
    input.preview.has_errors || issues.some((issue) => issue.severity === 'error');

  return { preview: input.preview, lines, issues, has_errors };
}

function resolutionFor(
  resolutions: BulletinConflictResolution[],
  plate: string,
  field: string,
): 'keep_current' | 'apply_incoming' | undefined {
  const needle = normalizeVehicleRegistration(plate);
  const hit = resolutions.find(
    (row) => normalizeVehicleRegistration(row.vehicle_registration) === needle && row.field === field,
  );
  return hit?.resolution;
}

export async function importLoadingProgram(input: {
  client: SupabaseClient<Database>;
  preview: BulletinPreview;
  actor: LoadingProgramActor;
  createUnplanned?: string[];
  resolutions?: BulletinConflictResolution[];
  originalFilename?: string | null;
  storagePath?: string | null;
}): Promise<{ loading_list_id: string; trucks_attached: number; trucks_created: number }> {
  const { client, preview, actor } = input;
  const options = importLoadingProgramSchema.parse({
    create_unplanned: input.createUnplanned ?? [],
    resolutions: input.resolutions ?? [],
  });
  await assertManagement(client, actor.id);

  const analysis = await analyzeBulletinImport({ client, preview });
  const createSet = new Set(options.create_unplanned.map((plate) => normalizeVehicleRegistration(plate)));

  for (const line of analysis.lines) {
    if (line.match === 'other_bp') {
      throw new Error(
        `${line.draft.vehicle_registration} is already on Loading Program ${line.other_bulletin}.`,
      );
    }
    if (line.match === 'none' && !createSet.has(normalizeVehicleRegistration(line.draft.vehicle_registration))) {
      throw new Error(
        `${line.draft.vehicle_registration} is not an expected or arrived trip. Create as unplanned, or confirm arrival first.`,
      );
    }
  }

  const loadingDate = preview.header.loading_date;
  if (!loadingDate) {
    throw new Error('Loading Program / BP is missing a loading date.');
  }

  let loadingListId: string | null = null;
  if (preview.header.bulletin_number) {
    const { data: existing, error: existingError } = await client
      .from('loading_lists')
      .select('id')
      .eq('bulletin_number', preview.header.bulletin_number)
      .maybeSingle();
    if (existingError) throw existingError;
    loadingListId = existing?.id ?? null;
  }

  const listPatch = {
    loading_date: loadingDate,
    bulletin_number: preview.header.bulletin_number,
    program_code: preview.header.program_code,
    client_name: preview.header.client_name,
    destination: preview.header.destination,
    cargo_description: preview.header.cargo_description,
    customs_agency: preview.header.customs_agency,
    license_number: preview.header.license_number,
    loading_point: preview.header.loading_point,
    original_filename: input.originalFilename ?? preview.source_filename,
    storage_path: input.storagePath ?? null,
    status: 'active' as const,
  };

  if (loadingListId) {
    const { error: updateError } = await client.from('loading_lists').update(listPatch).eq('id', loadingListId);
    if (updateError) throw updateError;
  } else {
    const { data: created, error: createError } = await client
      .from('loading_lists')
      .insert({ ...listPatch, created_by: actor.id })
      .select('id')
      .single();
    if (createError) {
      if (isUniqueViolation(createError)) {
        throw new Error(`Loading Program ${preview.header.bulletin_number} already exists.`);
      }
      throw createError;
    }
    loadingListId = created.id;
  }

  const open = await loadOpenTrips(client);
  let attached = 0;
  let created = 0;

  for (const line of preview.lines) {
    const draft = line.draft;
    const plate = normalizeVehicleRegistration(draft.vehicle_registration);
    let truck = open.find((row) => normalizeVehicleRegistration(row.vehicle_registration) === plate) ?? null;

    if (!truck && createSet.has(plate)) {
      const horseId = await ensureVehicle(client, draft.vehicle_registration);
      const trailerId = await ensureVehicle(client, draft.trailer_registration);
      const trailer2Id = await ensureVehicle(client, draft.trailer_registration_2);
      const fieldSources: FieldSources = {
        vehicle_registration: FieldSource.Bp,
        trailer_registration: FieldSource.Bp,
        trailer_registration_2: FieldSource.Bp,
        container_number: FieldSource.Bp,
        driver_name: FieldSource.Bp,
        driver_passport_reference: FieldSource.Bp,
        transporter_name: FieldSource.Bp,
        border: FieldSource.Bp,
        client_name: FieldSource.Bp,
        packing_list_number: FieldSource.Bp,
      };
      const { data: inserted, error: insertError } = await client
        .from('trucks')
        .insert({
          loading_list_id: loadingListId,
          vehicle_registration: draft.vehicle_registration.trim(),
          trailer_registration: draft.trailer_registration,
          trailer_registration_2: draft.trailer_registration_2,
          container_number: draft.container_number,
          driver_name: draft.driver_name,
          driver_passport_reference: draft.driver_passport_reference,
          transporter_name: draft.transporter_name,
          client_name: preview.header.client_name,
          border: draft.border,
          packing_list_number: draft.packing_list_number,
          cargo_description: preview.header.cargo_description,
          program_sequence: draft.sequence,
          package_count: draft.package_count,
          gross_weight_t: draft.gross_weight_t,
          net_weight_t: draft.net_weight_t,
          arrival_status: ArrivalStatus.Arrived,
          arrived_at: new Date().toISOString(),
          arrived_by: actor.id,
          unplanned: true,
          status: TruckStatus.Waiting,
          horse_vehicle_id: horseId,
          trailer_vehicle_id: trailerId,
          trailer2_vehicle_id: trailer2Id,
          field_sources: fieldSources as Json,
          created_by: actor.id,
        })
        .select('*')
        .single();
      if (insertError) {
        if (isUniqueViolation(insertError)) {
          throw new Error(`Vehicle ${draft.vehicle_registration} already has an open trip.`);
        }
        throw insertError;
      }
      truck = inserted as OpenTrip;
      created += 1;
      const { error: auditError } = await client.from('audit_events').insert({
        entity_type: 'truck',
        entity_id: truck.id,
        truck_id: truck.id,
        action: 'unplanned_registered',
        actor_id: actor.id,
        actor_display_name: actor.display_name,
        metadata: {
          source: FieldSource.Bp,
          vehicle_registration: draft.vehicle_registration,
          bulletin_number: preview.header.bulletin_number,
        },
      });
      if (auditError) throw auditError;
      attached += 1;
      continue;
    }

    if (!truck) {
      throw new Error(`${draft.vehicle_registration} could not be attached to the Loading Program.`);
    }

    const sources = asSources(truck.field_sources);
    const nextSources: FieldSources = { ...sources };
    const patch: Database['public']['Tables']['trucks']['Update'] = {
      loading_list_id: loadingListId,
      program_sequence: draft.sequence,
      packing_list_number: draft.packing_list_number,
      package_count: draft.package_count,
      gross_weight_t: draft.gross_weight_t,
      net_weight_t: draft.net_weight_t,
      cargo_description: preview.header.cargo_description,
      horse_vehicle_id: (await ensureVehicle(client, draft.vehicle_registration)) ?? truck.horse_vehicle_id,
      trailer_vehicle_id: await ensureVehicle(client, draft.trailer_registration ?? truck.trailer_registration),
      trailer2_vehicle_id: await ensureVehicle(client, draft.trailer_registration_2 ?? truck.trailer_registration_2),
    };
    nextSources.packing_list_number = FieldSource.Bp;
    nextSources.program_sequence = FieldSource.Bp;
    nextSources.package_count = FieldSource.Bp;
    nextSources.gross_weight_t = FieldSource.Bp;
    nextSources.net_weight_t = FieldSource.Bp;

    const audits: Database['public']['Tables']['audit_events']['Insert'][] = [
      {
        entity_type: 'truck',
        entity_id: truck.id,
        truck_id: truck.id,
        action: 'bp_imported',
        actor_id: actor.id,
        actor_display_name: actor.display_name,
        new_value: preview.header.bulletin_number,
        metadata: {
          source: FieldSource.Bp,
          program_sequence: draft.sequence,
          packing_list_number: draft.packing_list_number,
        },
      },
    ];

    for (const field of BP_CONFLICT_FIELDS) {
      const current = textField(truck, field);
      const incoming = incomingForField(draft, field, preview.header.client_name);
      const resolved = resolveBpFieldUpdate({
        field,
        current,
        incoming,
        currentSource: sources[field],
        resolution: resolutionFor(options.resolutions, draft.vehicle_registration, field),
      });
      if (resolved.applied) {
        (patch as Record<string, string | null>)[field] = resolved.value;
        nextSources[field] = FieldSource.Bp;
        audits.push({
          entity_type: 'truck',
          entity_id: truck.id,
          truck_id: truck.id,
          action: 'bp_field_applied',
          field_name: field,
          previous_value: current,
          new_value: resolved.value,
          actor_id: actor.id,
          actor_display_name: actor.display_name,
          metadata: { source: FieldSource.Bp, previous_source: sources[field] ?? null },
        });
      } else if (resolved.conflict) {
        audits.push({
          entity_type: 'truck',
          entity_id: truck.id,
          truck_id: truck.id,
          action: 'bp_conflict_kept',
          field_name: field,
          previous_value: current,
          new_value: incoming,
          actor_id: actor.id,
          actor_display_name: actor.display_name,
          metadata: { source: FieldSource.Yard, incoming_source: FieldSource.Bp },
        });
      }
    }

    patch.field_sources = mergeFieldSources(sources, nextSources) as Json;

    const { error: updateError } = await client.from('trucks').update(patch).eq('id', truck.id);
    if (updateError) throw updateError;

    const { error: auditError } = await client.from('audit_events').insert(audits);
    if (auditError) throw auditError;
    attached += 1;
  }

  const { error: headerAuditError } = await client.from('audit_events').insert({
    entity_type: 'loading_list',
    entity_id: loadingListId,
    action: 'bp_imported',
    actor_id: actor.id,
    actor_display_name: actor.display_name,
    metadata: {
      bulletin_number: preview.header.bulletin_number,
      program_code: preview.header.program_code,
      trucks_attached: attached,
      trucks_created: created,
      original_filename: input.originalFilename ?? preview.source_filename,
    },
  });
  if (headerAuditError) throw headerAuditError;

  return { loading_list_id: loadingListId, trucks_attached: attached, trucks_created: created };
}

export async function fetchLoadingProgramForExport(
  client: SupabaseClient<Database>,
  loadingListId: string,
): Promise<{ list: Tables<'loading_lists'>; trucks: Tables<'trucks'>[] }> {
  const { data: list, error: listError } = await client
    .from('loading_lists')
    .select('*')
    .eq('id', loadingListId)
    .maybeSingle();
  if (listError) throw listError;
  if (!list) throw new Error('Loading Program / BP was not found.');

  const { data: trucks, error: truckError } = await client
    .from('trucks')
    .select('*')
    .eq('loading_list_id', loadingListId)
    .order('program_sequence', { ascending: true, nullsFirst: false })
    .order('vehicle_registration', { ascending: true });
  if (truckError) throw truckError;

  return { list, trucks: trucks ?? [] };
}
