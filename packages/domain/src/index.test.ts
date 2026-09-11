import { describe, expect, it } from 'vitest';
import {
  TruckStatus,
  calculateTruckTotalWeightKg,
  canMobileTransitionTruckStatus,
  canMobileWorkOnTruck,
  canTransitionTruckStatus,
  getAllowedTruckStatusTransitions,
  getManagementTruckStatusActions,
  getTruckLoadIndicator,
  requiresTruckStatusChangeReason,
  assertMobileTruckStatusTransition,
  assertTruckStatusTransition,
  InvalidTruckStatusTransitionError,
} from './index.js';

describe('canTransitionTruckStatus', () => {
  it('allows waiting → available → loading → completed', () => {
    expect(canTransitionTruckStatus(TruckStatus.Waiting, TruckStatus.Available)).toBe(true);
    expect(canTransitionTruckStatus(TruckStatus.Available, TruckStatus.Loading)).toBe(true);
    expect(canTransitionTruckStatus(TruckStatus.Loading, TruckStatus.Completed)).toBe(true);
  });

  it('rejects waiting → loading (management must release available first)', () => {
    expect(canTransitionTruckStatus(TruckStatus.Waiting, TruckStatus.Loading)).toBe(false);
  });

  it('rejects completed → loading', () => {
    expect(canTransitionTruckStatus(TruckStatus.Completed, TruckStatus.Loading)).toBe(false);
  });
});

describe('getManagementTruckStatusActions', () => {
  it('offers available from waiting', () => {
    expect(getManagementTruckStatusActions(TruckStatus.Waiting)).toEqual([
      TruckStatus.Available,
      TruckStatus.OnHold,
      TruckStatus.Cancelled,
    ]);
  });

  it('does not offer loading from available', () => {
    expect(getManagementTruckStatusActions(TruckStatus.Available)).toEqual([
      TruckStatus.OnHold,
      TruckStatus.Cancelled,
    ]);
  });
});

describe('getAllowedTruckStatusTransitions', () => {
  it('returns hold and cancel options from loading', () => {
    expect(getAllowedTruckStatusTransitions(TruckStatus.Loading)).toEqual([
      TruckStatus.Completed,
      TruckStatus.OnHold,
      TruckStatus.Cancelled,
    ]);
  });

  it('returns empty for completed', () => {
    expect(getAllowedTruckStatusTransitions(TruckStatus.Completed)).toEqual([]);
  });
});

describe('canMobileWorkOnTruck', () => {
  it('allows available and loading only', () => {
    expect(canMobileWorkOnTruck(TruckStatus.Available)).toBe(true);
    expect(canMobileWorkOnTruck(TruckStatus.Loading)).toBe(true);
    expect(canMobileWorkOnTruck(TruckStatus.Waiting)).toBe(false);
  });
});

describe('canMobileTransitionTruckStatus', () => {
  it('allows available → loading and loading → completed only', () => {
    expect(canMobileTransitionTruckStatus(TruckStatus.Available, TruckStatus.Loading)).toBe(true);
    expect(canMobileTransitionTruckStatus(TruckStatus.Loading, TruckStatus.Completed)).toBe(true);
  });

  it('rejects hold and cancel from the floor', () => {
    expect(canMobileTransitionTruckStatus(TruckStatus.Loading, TruckStatus.OnHold)).toBe(false);
    expect(canMobileTransitionTruckStatus(TruckStatus.Loading, TruckStatus.Cancelled)).toBe(false);
    expect(canMobileTransitionTruckStatus(TruckStatus.Available, TruckStatus.OnHold)).toBe(false);
    expect(canMobileTransitionTruckStatus(TruckStatus.Available, TruckStatus.Cancelled)).toBe(false);
  });
});

describe('assertMobileTruckStatusTransition', () => {
  it('throws for mobile hold attempts', () => {
    expect(() =>
      assertMobileTruckStatusTransition(TruckStatus.Loading, TruckStatus.OnHold),
    ).toThrow(InvalidTruckStatusTransitionError);
  });
});

describe('requiresTruckStatusChangeReason', () => {
  it('requires reason for hold and cancel only', () => {
    expect(requiresTruckStatusChangeReason(TruckStatus.OnHold)).toBe(true);
    expect(requiresTruckStatusChangeReason(TruckStatus.Cancelled)).toBe(true);
    expect(requiresTruckStatusChangeReason(TruckStatus.Available)).toBe(false);
    expect(requiresTruckStatusChangeReason(TruckStatus.Loading)).toBe(false);
    expect(requiresTruckStatusChangeReason(TruckStatus.Completed)).toBe(false);
  });
});

describe('assertTruckStatusTransition', () => {
  it('throws for invalid transitions', () => {
    expect(() =>
      assertTruckStatusTransition(TruckStatus.Completed, TruckStatus.Waiting),
    ).toThrow(InvalidTruckStatusTransitionError);
  });
});

describe('getTruckLoadIndicator', () => {
  const bags = [
    { verification_status: 'verified' },
    { verification_status: 'pending' },
    { verification_status: 'modified' },
    { verification_status: 'pending' },
  ];

  it('shows partial green progress while loading', () => {
    const indicator = getTruckLoadIndicator(TruckStatus.Loading, bags);
    expect(indicator.color).toBe('green');
    expect(indicator.phase).toBe('in_progress');
    expect(indicator.doneCount).toBe(2);
    expect(indicator.fillRatio).toBe(0.5);
  });

  it('is green when completed with all verified', () => {
    const indicator = getTruckLoadIndicator(TruckStatus.Completed, [
      { verification_status: 'verified' },
      { verification_status: 'verified' },
    ]);
    expect(indicator.color).toBe('green');
    expect(indicator.phase).toBe('completed_ok');
    expect(indicator.fillRatio).toBe(1);
  });

  it('is yellow when completed with modifications', () => {
    const indicator = getTruckLoadIndicator(TruckStatus.Completed, [
      { verification_status: 'verified' },
      { verification_status: 'modified' },
    ]);
    expect(indicator.color).toBe('yellow');
    expect(indicator.phase).toBe('completed_modified');
  });

  it('is red when completed incomplete', () => {
    const indicator = getTruckLoadIndicator(TruckStatus.Completed, bags);
    expect(indicator.color).toBe('red');
    expect(indicator.phase).toBe('completed_incomplete');
    expect(indicator.fillRatio).toBe(1);
  });
});

describe('calculateTruckTotalWeightKg', () => {
  it('sums weights', () => {
    expect(calculateTruckTotalWeightKg([1, 2, 3])).toBe(6);
  });
});
