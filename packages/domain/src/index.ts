/**
 * Shared domain concepts only — no React, no DB queries.
 * Field-level schemas remain TBD; do not invent product fields here.
 */

export const UserRole = {
  Management: 'management',
  LoadingStaff: 'loading_staff',
  YardAgent: 'yard_agent',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/**
 * Truck operational status.
 * Flow: waiting → available → loading → completed
 * Hold/cancel branch from waiting|available|loading; hold returns to available.
 */
export const TruckStatus = {
  Waiting: 'waiting',
  Available: 'available',
  Loading: 'loading',
  Completed: 'completed',
  OnHold: 'on_hold',
  Cancelled: 'cancelled',
} as const;

export type TruckStatus = (typeof TruckStatus)[keyof typeof TruckStatus];

export const BagVerificationStatus = {
  Pending: 'pending',
  Verified: 'verified',
  Modified: 'modified',
} as const;

export type BagVerificationStatus =
  (typeof BagVerificationStatus)[keyof typeof BagVerificationStatus];

export const LoadingListStatus = {
  Draft: 'draft',
  Active: 'active',
  Closed: 'closed',
} as const;

export type LoadingListStatus = (typeof LoadingListStatus)[keyof typeof LoadingListStatus];

/**
 * SQL table `loading_lists` is the Loading Program / BP.
 * Per-truck packing list is `trucks.packing_list_number` + `bags`.
 */
export const PreAlertStatus = {
  Draft: 'draft',
  Active: 'active',
  Paused: 'paused',
  Closed: 'closed',
  Cancelled: 'cancelled',
} as const;

export type PreAlertStatus = (typeof PreAlertStatus)[keyof typeof PreAlertStatus];

/** Yard confirm/cancel is only allowed while the Loading Order is active. */
export function isPreAlertYardMutable(status: string | null | undefined): boolean {
  return status === PreAlertStatus.Active;
}

/** Physical arrival lifecycle — independent of floor TruckStatus. */
export const ArrivalStatus = {
  Expected: 'expected',
  Arrived: 'arrived',
  Cancelled: 'cancelled',
  DidNotArrive: 'did_not_arrive',
} as const;

export type ArrivalStatus = (typeof ArrivalStatus)[keyof typeof ArrivalStatus];

/** Provenance of a trip field. Yard-sourced values are never silently overwritten. */
export const FieldSource = {
  PreAlert: 'pre_alert',
  Yard: 'yard',
  Bp: 'bp',
  PackingList: 'packing_list',
  Manual: 'manual',
} as const;

export type FieldSource = (typeof FieldSource)[keyof typeof FieldSource];

export type FieldSources = Partial<Record<string, FieldSource>>;

export function isYardProtectedSource(source: FieldSource | string | undefined): boolean {
  return source === FieldSource.Yard;
}

/** Trip fields that BP may conflict with yard-confirmed values. */
export const BP_CONFLICT_FIELDS = [
  'trailer_registration',
  'trailer_registration_2',
  'container_number',
  'driver_name',
  'driver_passport_reference',
  'transporter_name',
  'border',
  'client_name',
] as const;

export type BpConflictField = (typeof BP_CONFLICT_FIELDS)[number];

export type BpFieldResolution = 'keep_current' | 'apply_incoming';

export function tripFieldValuesDiffer(
  field: string,
  current: string | null | undefined,
  incoming: string | null | undefined,
): boolean {
  const left = current?.trim() || null;
  const right = incoming?.trim() || null;
  if (left == null && right == null) return false;
  if (left == null || right == null) return true;
  if (field.includes('registration')) {
    return normalizeVehicleRegistration(left) !== normalizeVehicleRegistration(right);
  }
  return left !== right;
}

/**
 * Yard-sourced values are never applied from BP unless management chooses apply_incoming.
 * Non-yard differences apply the BP value (source becomes bp).
 */
export function resolveBpFieldUpdate(input: {
  field: string;
  current: string | null | undefined;
  incoming: string | null | undefined;
  currentSource?: FieldSource | string | null;
  resolution?: BpFieldResolution | null;
}): {
  value: string | null;
  source: FieldSource | string | null | undefined;
  conflict: boolean;
  applied: boolean;
} {
  const current = input.current?.trim() || null;
  const incoming = input.incoming?.trim() || null;
  if (!tripFieldValuesDiffer(input.field, current, incoming)) {
    return { value: current, source: input.currentSource, conflict: false, applied: false };
  }

  const yardProtected = isYardProtectedSource(input.currentSource ?? undefined);
  if (yardProtected) {
    if (input.resolution === 'apply_incoming') {
      return { value: incoming, source: FieldSource.Bp, conflict: true, applied: true };
    }
    return { value: current, source: input.currentSource, conflict: true, applied: false };
  }

  return { value: incoming, source: FieldSource.Bp, conflict: false, applied: true };
}

/** Open trip that occupies a physical horse plate. */
export function isOpenOperationalTrip(
  arrivalStatus: ArrivalStatus,
  truckStatus: TruckStatus,
): boolean {
  if (arrivalStatus !== ArrivalStatus.Expected && arrivalStatus !== ArrivalStatus.Arrived) {
    return false;
  }
  return truckStatus !== TruckStatus.Completed && truckStatus !== TruckStatus.Cancelled;
}

const PRIMARY_TRANSITIONS: ReadonlyArray<{ from: TruckStatus; to: TruckStatus }> = [
  { from: TruckStatus.Waiting, to: TruckStatus.Available },
  { from: TruckStatus.Waiting, to: TruckStatus.OnHold },
  { from: TruckStatus.Waiting, to: TruckStatus.Cancelled },
  { from: TruckStatus.Available, to: TruckStatus.Loading },
  { from: TruckStatus.Available, to: TruckStatus.OnHold },
  { from: TruckStatus.Available, to: TruckStatus.Cancelled },
  { from: TruckStatus.Loading, to: TruckStatus.Completed },
  { from: TruckStatus.Loading, to: TruckStatus.OnHold },
  { from: TruckStatus.Loading, to: TruckStatus.Cancelled },
  { from: TruckStatus.OnHold, to: TruckStatus.Available },
  { from: TruckStatus.OnHold, to: TruckStatus.Cancelled },
];

/** Statuses management may set from the Loading overview (not Loading/Completed). */
export const MANAGEMENT_STATUS_ACTIONS: readonly TruckStatus[] = [
  TruckStatus.Available,
  TruckStatus.OnHold,
  TruckStatus.Cancelled,
];

/** Controlled transitions — refine with stakeholders before locking product rules. */
export function canTransitionTruckStatus(from: TruckStatus, to: TruckStatus): boolean {
  if (from === to) return false;
  return PRIMARY_TRANSITIONS.some((t) => t.from === from && t.to === to);
}

/** Next statuses allowed from the current status. */
export function getAllowedTruckStatusTransitions(from: TruckStatus): TruckStatus[] {
  return PRIMARY_TRANSITIONS.filter((t) => t.from === from).map((t) => t.to);
}

/** Management bulk/status actions available from the current status. */
export function getManagementTruckStatusActions(from: TruckStatus): TruckStatus[] {
  const allowed = new Set(getAllowedTruckStatusTransitions(from));
  return MANAGEMENT_STATUS_ACTIONS.filter((status) => allowed.has(status));
}

/** Floor staff may verify/edit bags only when available or actively loading. */
export function canMobileWorkOnTruck(status: TruckStatus): boolean {
  return status === TruckStatus.Available || status === TruckStatus.Loading;
}

/**
 * Mobile-allowed status transitions (ADR-002 / Phase 4).
 * Hold / Cancel stay management-only on desktop.
 */
export function canMobileTransitionTruckStatus(from: TruckStatus, to: TruckStatus): boolean {
  if (from === TruckStatus.Available && to === TruckStatus.Loading) return true;
  if (from === TruckStatus.Loading && to === TruckStatus.Completed) return true;
  return false;
}

/** Throws when mobile attempts a status change outside the floor-allowed set. */
export function assertMobileTruckStatusTransition(from: TruckStatus, to: TruckStatus): void {
  if (!canMobileTransitionTruckStatus(from, to)) {
    throw new InvalidTruckStatusTransitionError(from, to);
  }
  assertTruckStatusTransition(from, to);
}

/** Hold/cancel require an operational reason. */
export function requiresTruckStatusChangeReason(to: TruckStatus): boolean {
  return to === TruckStatus.OnHold || to === TruckStatus.Cancelled;
}

export class InvalidTruckStatusTransitionError extends Error {
  readonly from: TruckStatus;
  readonly to: TruckStatus;

  constructor(from: TruckStatus, to: TruckStatus) {
    super(`Invalid truck status transition: ${from} → ${to}`);
    this.name = 'InvalidTruckStatusTransitionError';
    this.from = from;
    this.to = to;
  }
}

/** Throws when the transition is not allowed by domain rules. */
export function assertTruckStatusTransition(from: TruckStatus, to: TruckStatus): void {
  if (!canTransitionTruckStatus(from, to)) {
    throw new InvalidTruckStatusTransitionError(from, to);
  }
}

/** Plate matching for yard queue, program assignment, and packing-list attach. */
export function normalizeVehicleRegistration(value: string): string {
  return value.trim().toUpperCase();
}

/** Sum bag net weights (kg). Domain pure helper — UI must not invent totals. */
export function calculateTruckTotalWeightKg(bagNetWeightsKg: readonly number[]): number {
  return bagNetWeightsKg.reduce((sum, weight) => sum + weight, 0);
}

export type BagProgressInput = {
  verification_status: string;
};

export type TruckLoadIndicatorColor = 'neutral' | 'green' | 'yellow' | 'red';

export type TruckLoadIndicator = {
  doneCount: number;
  modifiedCount: number;
  totalCount: number;
  /** Verified-or-modified ÷ total (0–1). */
  ratio: number;
  /** Bar fill amount (completed always full). */
  fillRatio: number;
  color: TruckLoadIndicatorColor;
  phase:
    | 'idle'
    | 'in_progress'
    | 'completed_ok'
    | 'completed_modified'
    | 'completed_incomplete';
  explanation: string;
};

function isBagDone(status: string): boolean {
  return status === BagVerificationStatus.Verified || status === BagVerificationStatus.Modified;
}

/**
 * Loading-list progress / completion tone for a truck.
 * Progress = bags verified or modified ÷ total bags.
 */
export function getTruckLoadIndicator(
  status: TruckStatus,
  bags: readonly BagProgressInput[],
): TruckLoadIndicator {
  const totalCount = bags.length;
  const doneCount = bags.filter((bag) => isBagDone(bag.verification_status)).length;
  const modifiedCount = bags.filter(
    (bag) => bag.verification_status === BagVerificationStatus.Modified,
  ).length;
  const ratio = totalCount === 0 ? 0 : doneCount / totalCount;

  if (status === TruckStatus.Completed) {
    if (totalCount === 0) {
      return {
        doneCount: 0,
        modifiedCount: 0,
        totalCount: 0,
        ratio: 0,
        fillRatio: 1,
        color: 'red',
        phase: 'completed_incomplete',
        explanation: 'Marked completed with no bags on the packing list.',
      };
    }
    if (doneCount < totalCount) {
      return {
        doneCount,
        modifiedCount,
        totalCount,
        ratio,
        fillRatio: 1,
        color: 'red',
        phase: 'completed_incomplete',
        explanation: `Completed with ${doneCount} of ${totalCount} bags verified. Remaining bags were still pending.`,
      };
    }
    if (modifiedCount > 0) {
      return {
        doneCount,
        modifiedCount,
        totalCount,
        ratio: 1,
        fillRatio: 1,
        color: 'yellow',
        phase: 'completed_modified',
        explanation: `All ${totalCount} bags checked; ${modifiedCount} had weight/seal modifications.`,
      };
    }
    return {
      doneCount,
      modifiedCount: 0,
      totalCount,
      ratio: 1,
      fillRatio: 1,
      color: 'green',
      phase: 'completed_ok',
      explanation: `All ${totalCount} bags verified with no modifications.`,
    };
  }

  if (status === TruckStatus.Loading) {
    return {
      doneCount,
      modifiedCount,
      totalCount,
      ratio,
      fillRatio: ratio,
      color: 'green',
      phase: 'in_progress',
      explanation:
        totalCount === 0
          ? 'Loading in progress; no bags listed yet.'
          : `${doneCount} of ${totalCount} bags verified or modified.`,
    };
  }

  if (status === TruckStatus.Available) {
    return {
      doneCount,
      modifiedCount,
      totalCount,
      ratio: 0,
      fillRatio: 0,
      color: 'neutral',
      phase: 'idle',
      explanation: 'Available for loading floor — work has not started yet.',
    };
  }

  if (status === TruckStatus.OnHold) {
    return {
      doneCount,
      modifiedCount,
      totalCount,
      ratio,
      fillRatio: ratio,
      color: 'neutral',
      phase: 'idle',
      explanation: `On hold. Progress so far: ${doneCount} of ${totalCount} bags.`,
    };
  }

  if (status === TruckStatus.Cancelled) {
    return {
      doneCount,
      modifiedCount,
      totalCount,
      ratio,
      fillRatio: ratio,
      color: 'neutral',
      phase: 'idle',
      explanation: 'Cancelled — not an active loading.',
    };
  }

  // waiting
  return {
    doneCount,
    modifiedCount,
    totalCount,
    ratio: 0,
    fillRatio: 0,
    color: 'neutral',
    phase: 'idle',
    explanation: 'Waiting — not yet released as available for the loading floor.',
  };
}
