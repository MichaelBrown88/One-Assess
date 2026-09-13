import { describe, expect, it } from 'vitest';
import {
  formatKg1,
  healthyMinimumWeightKg,
  projectWeightLossKg,
  WEIGHT_LOSS_WEEKS,
} from './weightLossProjection';

describe('healthyMinimumWeightKg', () => {
  it('floors an 81 kg male at a healthy BMI and ~20% fat on lean mass, not 58.5 kg', () => {
    const floor = healthyMinimumWeightKg({
      currentWeightKg: 81.2,
      heightCm: 175,
      sex: 'male',
      bodyFatPct: 31.2,
    });
    // Lean 55.9 kg at 20% BF → ~69.8 kg. BMI 21 at 175 cm → ~64.3 kg. Take the higher.
    expect(floor).toBeGreaterThan(68);
    expect(floor).toBeLessThan(81.2);
  });

  it('uses height when that BMI floor is higher than the composition floor', () => {
    const floor = healthyMinimumWeightKg({
      currentWeightKg: 81.2,
      heightCm: 185,
      sex: 'male',
      bodyFatPct: 31.2,
    });
    expect(floor).toBeGreaterThan(71);
  });
});

describe('projectWeightLossKg', () => {
  const ibrahim = {
    currentWeightKg: 81.2,
    weeklyRateKg: 0.6,
    bodyFatPct: 31.2,
    heightCm: 175,
    sex: 'male' as const,
  };

  it('never prints a 58.5 kg year target for a typical adult male cut', () => {
    const y1 = projectWeightLossKg({ ...ibrahim, weeks: WEIGHT_LOSS_WEEKS.oneYear });
    expect(y1.endWeightKg).toBeGreaterThan(68);
    expect(formatKg1(y1.endWeightKg)).not.toBe('58.5');
    expect(formatKg1(y1.lossKg)).not.toBe('22.7');
  });

  it('keeps 4-month on the weekly rate and does not undershoot the healthy floor at 1 year', () => {
    const m4 = projectWeightLossKg({ ...ibrahim, weeks: WEIGHT_LOSS_WEEKS.fourMonths });
    const y1 = projectWeightLossKg({ ...ibrahim, weeks: WEIGHT_LOSS_WEEKS.oneYear });
    expect(formatKg1(m4.lossKg)).toBe('9.6');
    expect(y1.lossKg).toBeGreaterThanOrEqual(m4.lossKg - 0.05);
    expect(y1.endWeightKg).toBeLessThanOrEqual(m4.endWeightKg + 0.05);
    expect(y1.endWeightKg).toBeGreaterThan(68);
    expect(m4.endWeightKg).toBeGreaterThan(68);
  });

  it('slows the cut when muscle-building is also a goal so year weight stays athletic', () => {
    const m4 = projectWeightLossKg({
      ...ibrahim,
      weeks: WEIGHT_LOSS_WEEKS.fourMonths,
      protectMuscle: true,
    });
    const y1 = projectWeightLossKg({
      ...ibrahim,
      weeks: WEIGHT_LOSS_WEEKS.oneYear,
      protectMuscle: true,
    });

    expect(m4.weeklyRateKg).toBe(0.33);
    expect(y1.lossKg).toBeLessThan(12);
    expect(y1.endWeightKg).toBeGreaterThan(70);
  });
});
