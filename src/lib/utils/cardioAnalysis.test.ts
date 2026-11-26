import { describe, expect, it } from 'vitest';
import { resolveCardioPillarRole, parseClientGoals } from '@/lib/goals/goalContext';
import { calculateCardioAnalysis, mapFitnessGoalLevel } from './cardioAnalysis';

/** Salem-like profile: late-20s male, build-muscle goal, submax treadmill-style HRs. */
const SALEM_AGE = 27;
const SALEM_GENDER = 'male' as const;
const SALEM_RHR = 76;
const SALEM_PEAK = 147;
const SALEM_RECOVERY_HR = 127;

describe('resolveCardioPillarRole', () => {
  it('keeps cardio off-path when hypertrophy is the main focus', () => {
    const ctx = parseClientGoals(null, ['build-muscle', 'weight-loss']);
    expect(resolveCardioPillarRole(ctx)).toBe('off-path');
  });

  it('uses primary when improve-fitness is selected', () => {
    const ctx = parseClientGoals(null, ['improve-fitness']);
    expect(resolveCardioPillarRole(ctx)).toBe('primary');
  });
});

describe('calculateCardioAnalysis', () => {
  it('gives no VO2 number when the walk was too easy to extrapolate', () => {
    const result = calculateCardioAnalysis(
      40,
      'male',
      mapFitnessGoalLevel('active'),
      77,
      112,
      91,
      undefined,
      { pillarRole: 'supporting', protocolVersion: 'incline-walk-4min-v1' },
    );

    // (112 - 77) / (180 - 77) = 34% of heart-rate reserve: too easy, so no invented VO2.
    expect(result.vo2.current).toBe(0);
  });

  it('does not assign elite VO2 target for build-muscle maintenance profile', () => {
    const result = calculateCardioAnalysis(
      SALEM_AGE,
      SALEM_GENDER,
      mapFitnessGoalLevel('active'),
      SALEM_RHR,
      SALEM_PEAK,
      SALEM_RECOVERY_HR,
      undefined,
      { pillarRole: 'supporting', protocolVersion: 'incline-walk-4min-v1' },
    );

    expect(result.maintenanceMode).toBe(true);
    expect(result.vo2.current).toBeGreaterThan(38);
    expect(result.vo2.current).toBeLessThanOrEqual(50);
    expect(result.vo2.target).toBeLessThanOrEqual(52);
    expect(result.vo2.gap).toBeLessThan(12);
  });

  it('a lower walk heart rate (same resting HR) estimates higher fitness, never pinned to 50', () => {
    const harder = calculateCardioAnalysis(
      31,
      'male',
      'active',
      62,
      160,
      121,
      undefined,
      { pillarRole: 'supporting', protocolVersion: 'incline-walk-4min-v1' },
    );
    const easier = calculateCardioAnalysis(
      31,
      'male',
      'active',
      62,
      140,
      110,
      undefined,
      { pillarRole: 'supporting', protocolVersion: 'incline-walk-4min-v1' },
    );

    expect(harder.vo2.current).not.toBe(50);
    expect(easier.vo2.current).toBeGreaterThan(harder.vo2.current);
  });

  it('still allows ambitious VO2 gap when fitness is a primary goal', () => {
    const result = calculateCardioAnalysis(
      SALEM_AGE,
      SALEM_GENDER,
      mapFitnessGoalLevel('active'),
      SALEM_RHR,
      SALEM_PEAK,
      SALEM_RECOVERY_HR,
      undefined,
      { pillarRole: 'primary', protocolVersion: 'incline-walk-4min-v1' },
    );

    expect(result.maintenanceMode).toBeUndefined();
    expect(result.vo2.target).toBeGreaterThan(result.vo2.current);
    expect(result.vo2.gap).toBeGreaterThan(0);
  });
});

it('does not reinterpret historical heart rates as the new walk protocol', () => {
  expect(calculateCardioAnalysis(38, 'male', 'active', 62, 150, 118).vo2.current).toBe(0);
});
