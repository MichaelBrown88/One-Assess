import { describe, expect, it } from 'vitest';
import { projectClientTwelveWeekWeightLoss } from './clientTwelveWeekWeight';
import type { FormData } from '@/contexts/FormContext';

const ibrahim = {
  inbodyWeightKg: '81.2',
  inbodyBodyFatPct: '31.2',
  skeletalMuscleMassKg: '31.5',
  heightCm: '175',
  gender: 'male',
  dateOfBirth: '1995-03-25',
  clientGoals: ['weight-loss', 'build-muscle', 'improve-fitness'],
  activityLevel: 'sedentary',
} as FormData;

describe('projectClientTwelveWeekWeightLoss', () => {
  it('projects a healthy 12-week loss, not a crash', () => {
    const result = projectClientTwelveWeekWeightLoss(ibrahim, undefined, ibrahim.clientGoals);
    expect(result).not.toBeNull();
    expect(result!.endWeightKg).toBeGreaterThan(74);
    expect(result!.endWeightKg).toBeLessThan(81.2);
    expect(result!.weeklyRateKg).toBeGreaterThan(0);
    expect(result!.weeklyRateKg).toBeLessThan(0.7);
  });

  it('uses the same weekly rate for an explicit current weight', () => {
    const fromProfile = projectClientTwelveWeekWeightLoss(ibrahim, undefined, ibrahim.clientGoals);
    const fromGap = projectClientTwelveWeekWeightLoss(ibrahim, undefined, ibrahim.clientGoals, 81.2);
    expect(fromGap?.weeklyRateKg).toBe(fromProfile?.weeklyRateKg);
    expect(fromGap?.lossKg).toBe(fromProfile?.lossKg);
  });
});
