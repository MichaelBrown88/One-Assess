import { describe, expect, it } from 'vitest';
import {
  SEGMENTAL_IMBALANCE_MATERIAL_PCT,
  segmentalImbalanceCue,
} from './segmentalImbalanceCue';

describe('segmentalImbalanceCue', () => {
  it('returns null when sides are balanced', () => {
    expect(
      segmentalImbalanceCue({
        segmentalArmLeftKg: '3.2',
        segmentalArmRightKg: '3.3',
        segmentalLegLeftKg: '9.1',
        segmentalLegRightKg: '9.2',
      }),
    ).toBeNull();
  });

  it('returns null when values are missing or zero', () => {
    expect(segmentalImbalanceCue({})).toBeNull();
    expect(
      segmentalImbalanceCue({
        segmentalArmLeftKg: '0',
        segmentalArmRightKg: '3.2',
      }),
    ).toBeNull();
  });

  it(`flags a material arm gap (>= ${SEGMENTAL_IMBALANCE_MATERIAL_PCT}%)`, () => {
    const cue = segmentalImbalanceCue({
      segmentalArmLeftKg: '2.5',
      segmentalArmRightKg: '3.2',
    });
    expect(cue).toMatch(/Arms: left lighter/i);
    expect(cue).toMatch(/%/);
  });

  it('flags both arms and legs when both gaps are material', () => {
    const cue = segmentalImbalanceCue({
      segmentalArmLeftKg: '3.5',
      segmentalArmRightKg: '2.8',
      segmentalLegLeftKg: '8.0',
      segmentalLegRightKg: '9.5',
    });
    expect(cue).toMatch(/Arms: right lighter/i);
    expect(cue).toMatch(/Legs: left lighter/i);
  });
});
