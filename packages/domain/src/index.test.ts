import { describe, expect, it } from 'vitest';
import {
  TruckStatus,
  calculateTruckTotalWeightKg,
  canTransitionTruckStatus,
} from './index.js';

describe('canTransitionTruckStatus', () => {
  it('allows waiting → loading → completed', () => {
    expect(canTransitionTruckStatus(TruckStatus.Waiting, TruckStatus.Loading)).toBe(true);
    expect(canTransitionTruckStatus(TruckStatus.Loading, TruckStatus.Completed)).toBe(true);
  });

  it('rejects completed → loading', () => {
    expect(canTransitionTruckStatus(TruckStatus.Completed, TruckStatus.Loading)).toBe(false);
  });
});

describe('calculateTruckTotalWeightKg', () => {
  it('sums bag weights', () => {
    expect(calculateTruckTotalWeightKg([1551, 1706])).toBe(3257);
  });
});
