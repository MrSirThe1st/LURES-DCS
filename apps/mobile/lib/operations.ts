import { transitionTruckStatus, type Tables } from '@lures-dcs/data-access';
import {
  TruckStatus,
  assertMobileTruckStatusTransition,
  canMobileWorkOnTruck,
} from '@lures-dcs/domain';
import { getSupabaseClient } from './supabase';

export type Profile = Tables<'profiles'>;
export type Bag = Tables<'bags'>;
export type Truck = Tables<'trucks'>;

type BagUpdateInput = {
  bag: Bag;
  profile: Profile;
  netWeightKg: number;
  sealNumber: string;
  reason?: string;
  markVerified: boolean;
};

export async function saveBagVerification(input: BagUpdateInput): Promise<void> {
  const { bag, profile, netWeightKg, sealNumber, reason, markVerified } = input;
  const supabase = getSupabaseClient();

  const { data: truck, error: truckLookupError } = await supabase
    .from('trucks')
    .select('id, status')
    .eq('id', bag.truck_id)
    .maybeSingle();
  if (truckLookupError) throw truckLookupError;
  if (!truck || !canMobileWorkOnTruck(truck.status)) {
    throw new Error('This truck is not available for loading yet. Wait for management release.');
  }

  const previousWeight = Number(bag.net_weight_kg);
  const previousSeal = bag.seal_number ?? '';
  const nextSeal = sealNumber.trim();
  const weightChanged = previousWeight !== netWeightKg;
  const sealChanged = previousSeal !== nextSeal;

  if ((weightChanged || sealChanged) && !reason?.trim()) {
    throw new Error('A reason is required when changing weight or seal.');
  }

  let verificationStatus = bag.verification_status;
  let verifiedAt = bag.verified_at;
  let verifiedBy = bag.verified_by;

  if (markVerified) {
    verificationStatus = weightChanged || sealChanged ? 'modified' : 'verified';
    verifiedAt = new Date().toISOString();
    verifiedBy = profile.id;
  } else if (weightChanged || sealChanged) {
    verificationStatus = 'modified';
  }

  const { error: updateError } = await supabase
    .from('bags')
    .update({
      net_weight_kg: netWeightKg,
      seal_number: nextSeal || null,
      verification_status: verificationStatus,
      verified_at: verifiedAt,
      verified_by: verifiedBy,
    })
    .eq('id', bag.id);

  if (updateError) throw updateError;

  const events: Array<{
    entity_type: string;
    entity_id: string;
    truck_id: string;
    bag_id: string;
    action: string;
    field_name: string | null;
    previous_value: string | null;
    new_value: string | null;
    reason: string | null;
    actor_id: string;
    actor_display_name: string;
  }> = [];

  if (markVerified && !weightChanged && !sealChanged) {
    events.push({
      entity_type: 'bag',
      entity_id: bag.id,
      truck_id: bag.truck_id,
      bag_id: bag.id,
      action: 'bag_verified',
      field_name: null,
      previous_value: bag.verification_status,
      new_value: 'verified',
      reason: null,
      actor_id: profile.id,
      actor_display_name: profile.display_name,
    });
  }

  if (weightChanged) {
    events.push({
      entity_type: 'bag',
      entity_id: bag.id,
      truck_id: bag.truck_id,
      bag_id: bag.id,
      action: 'weight_changed',
      field_name: 'net_weight_kg',
      previous_value: String(previousWeight),
      new_value: String(netWeightKg),
      reason: reason?.trim() ?? null,
      actor_id: profile.id,
      actor_display_name: profile.display_name,
    });
  }

  if (sealChanged) {
    events.push({
      entity_type: 'bag',
      entity_id: bag.id,
      truck_id: bag.truck_id,
      bag_id: bag.id,
      action: 'seal_changed',
      field_name: 'seal_number',
      previous_value: previousSeal || null,
      new_value: nextSeal || null,
      reason: reason?.trim() ?? null,
      actor_id: profile.id,
      actor_display_name: profile.display_name,
    });
  }

  if (events.length > 0) {
    const { error: auditError } = await supabase.from('audit_events').insert(events);
    if (auditError) throw auditError;
  }

  if (truck.status === TruckStatus.Available) {
    assertMobileTruckStatusTransition(TruckStatus.Available, TruckStatus.Loading);
    await transitionTruckStatus({
      client: supabase,
      truckId: truck.id,
      from: TruckStatus.Available,
      to: TruckStatus.Loading,
      actor: profile,
      reason: 'Loading started from bag verification',
    });
  }
}

export async function completeTruck(truck: Truck, profile: Profile): Promise<void> {
  assertMobileTruckStatusTransition(truck.status, TruckStatus.Completed);
  await transitionTruckStatus({
    client: getSupabaseClient(),
    truckId: truck.id,
    from: truck.status,
    to: TruckStatus.Completed,
    actor: profile,
    reason: 'Truck loading completed',
  });
}
