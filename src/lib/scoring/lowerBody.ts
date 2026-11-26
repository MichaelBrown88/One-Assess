import type { FormData } from '@/contexts/FormContext';
import { safeParse } from '@/lib/utils/numbers';
import { scoreFromPoints } from './scoringUtils';

/**
 * Lower-body test. Current protocol: 30-second single-leg sit-to-stand from a
 * knee-height box, reps per leg. Older assessments used one-minute squats.
 */
export type LowerBodyProtocol = 'single-leg-sts-30sec' | 'squats-60sec';

export interface LowerBodyResult {
  /** Average reps per leg (single-leg), or squat reps (legacy). */
  reps: number;
  protocol: LowerBodyProtocol;
  leftReps: number | null;
  rightReps: number | null;
}

const entered = (v: string | undefined | null) => typeof v === 'string' && v.trim() !== '';

/** Reads the lower-body result, preferring the single-leg test. 0 is a real result. */
export function readLowerBody(form: Partial<FormData> | undefined | null): LowerBodyResult | null {
  if (!form) return null;
  const hasLeft = entered(form.singleLegStandLeftReps);
  const hasRight = entered(form.singleLegStandRightReps);
  if (hasLeft || hasRight) {
    const left = hasLeft ? safeParse(form.singleLegStandLeftReps) : null;
    const right = hasRight ? safeParse(form.singleLegStandRightReps) : null;
    const sides = [left, right].filter((v): v is number => v !== null);
    const reps = Math.round((sides.reduce((a, b) => a + b, 0) / sides.length) * 10) / 10;
    return { reps, protocol: 'single-leg-sts-30sec', leftReps: left, rightReps: right };
  }
  if (entered(form.squatsOneMinuteReps)) {
    return { reps: safeParse(form.squatsOneMinuteReps), protocol: 'squats-60sec', leftReps: null, rightReps: null };
  }
  return null;
}

/**
 * PROVISIONAL bands for the average single-leg sit-to-stand reps in 30 s.
 * There are no solid published age/sex norms for this test (research uses it
 * mainly for left/right symmetry), so these are a starting point to be
 * revisited with One Fitness client data. Women sit one rep below men; each
 * age band above 39 lowers the thresholds. 0 reps scores 10.
 */
export function scoreSingleLegSitToStand(avgReps: number, age: number, gender: string): number | null {
  const sex = (gender || '').toLowerCase();
  if (!(age > 0) || (sex !== 'male' && sex !== 'female') || avgReps < 0) return null;
  const sexOffset = sex === 'female' ? 1 : 0;
  const ageOffset = age >= 60 ? 4 : age >= 40 ? 2 : 0;
  const o = sexOffset + ageOffset;
  return Math.round(
    scoreFromPoints(avgReps, [
      [0, 10],
      [Math.max(1, 4 - o), 25],
      [8 - o, 50],
      [12 - o, 75],
      [16 - o, 100],
    ]),
  );
}
