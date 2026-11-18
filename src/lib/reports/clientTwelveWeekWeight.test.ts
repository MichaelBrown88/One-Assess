import { describe, expect, it } from 'vitest';
import { projectClientTwelveWeekWeightLoss } from './clientTwelveWeekWeight';
import type { FormData } from '@/contexts/FormContext';
import { PLAN_WEEKS } from './plannedTraining';

const sample = {
  inbodyWeightKg: '81.2',
  inbodyBodyFatPct: '31.2',
  skeletalMuscleMassKg: '31.5',
  heightCm: '175',
  gender: 'male',
  dateOfBirth: '1995-01-15',
  clientGoals: ['weight-loss', 'build-muscle', 'improve-fitness'],
  activityLevel: 'sedentary',
} as FormData;

describe('projectClientTwelveWeekWeightLoss', () => {
  it('projects a healthy plan-length loss, not a crash', () => {
    const result = projectClientTwelveWeekWeightLoss(sample, undefined, sample.clientGoals);
    expect(result).not.toBeNull();
    expect(result!.endWeightKg).toBeGreaterThan(71);
    expect(result!.endWeightKg).toBeLessThan(81.2);
    expect(result!.weeklyRateKg).toBeGreaterThan(0);
    expect(result!.weeklyRateKg).toBeLessThan(1);
  });

  it('slows the three-session cut when muscle is also a goal', () => {
    const planned = projectClientTwelveWeekWeightLoss(sample, undefined, sample.clientGoals);
    expect(planned).not.toBeNull();
    expect(planned!.weeklyRateKg).toBe(0.24);
    expect(planned!.lossKg).toBeCloseTo(PLAN_WEEKS * 0.24, 5);
  });

  it('retains a conservative pace and the healthy floor as training increases', () => {
    const at = (sessions: string) =>
      projectClientTwelveWeekWeightLoss(
        { ...sample, reportLiftingSessions: sessions },
        undefined,
        sample.clientGoals,
      )!;
    const three = at('3');
    const four = at('4');
    const five = at('5');
    expect(three.weeklyRateKg).toBe(0.24);
    expect(four.weeklyRateKg).toBe(0.28);
    expect(five.weeklyRateKg).toBe(0.32);
    expect(five.weeklyRateKg).toBeLessThanOrEqual(81.2 * 0.01);
    // 175 cm male: lean mass at 20% body fat is the floor (~69.8 kg).
    expect(five.endWeightKg).toBeGreaterThanOrEqual(69.8);
  });

  it('uses the same weekly rate for an explicit current weight', () => {
    const fromProfile = projectClientTwelveWeekWeightLoss(sample, undefined, sample.clientGoals);
    const fromGap = projectClientTwelveWeekWeightLoss(sample, undefined, sample.clientGoals, 81.2);
    expect(fromGap?.weeklyRateKg).toBe(fromProfile?.weeklyRateKg);
    expect(fromGap?.lossKg).toBe(fromProfile?.lossKg);
  });

  it('still projects a cut for a female recomp client, not a crash', () => {
    const result = projectClientTwelveWeekWeightLoss(
      { ...sample, gender: 'female' },
      undefined,
      sample.clientGoals,
    );
    expect(result).not.toBeNull();
    expect(result!.endWeightKg).toBeGreaterThan(74);
    expect(result!.endWeightKg).toBeLessThan(81.2);
  });
});
