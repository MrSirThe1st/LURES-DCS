/**
 * Shared domain concepts only — no React, no DB queries.
 * Field-level schemas remain TBD; do not invent product fields here.
 */

export const UserRole = {
  Management: 'management',
  LoadingStaff: 'loading_staff',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/** Conceptual truck statuses from product knowledge. Naming may be refined later. */
export const TruckStatus = {
  Waiting: 'waiting',
  Loading: 'loading',
  Completed: 'completed',
  OnHold: 'on_hold',
  Cancelled: 'cancelled',
} as const;

export type TruckStatus = (typeof TruckStatus)[keyof typeof TruckStatus];

const PRIMARY_TRANSITIONS: ReadonlyArray<{ from: TruckStatus; to: TruckStatus }> = [
  { from: TruckStatus.Waiting, to: TruckStatus.Loading },
  { from: TruckStatus.Loading, to: TruckStatus.Completed },
  { from: TruckStatus.Waiting, to: TruckStatus.OnHold },
  { from: TruckStatus.Loading, to: TruckStatus.OnHold },
  { from: TruckStatus.OnHold, to: TruckStatus.Loading },
  { from: TruckStatus.Waiting, to: TruckStatus.Cancelled },
  { from: TruckStatus.Loading, to: TruckStatus.Cancelled },
  { from: TruckStatus.OnHold, to: TruckStatus.Cancelled },
];

/** Controlled transitions — refine with stakeholders before locking product rules. */
export function canTransitionTruckStatus(from: TruckStatus, to: TruckStatus): boolean {
  if (from === to) return false;
  return PRIMARY_TRANSITIONS.some((t) => t.from === from && t.to === to);
}

/** Sum bag net weights (kg). Domain pure helper — UI must not invent totals. */
export function calculateTruckTotalWeightKg(bagNetWeightsKg: readonly number[]): number {
  return bagNetWeightsKg.reduce((sum, weight) => sum + weight, 0);
}
