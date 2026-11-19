/**
 * Fitness estimate from the studio walk: 4 minutes at 5 km/h, 10% incline,
 * with resting HR and HR at the end of the walk.
 *
 * 1. Oxygen cost of the walk: ACSM walking equation
 *    VO2 = 0.1·speed + 1.8·speed·grade + 3.5 (speed in m/min, grade as a fraction).
 * 2. Effort: share of heart-rate reserve used, (walk HR − rest) / (HRmax − rest),
 *    with HRmax = 208 − 0.7·age (Tanaka 2001).
 * 3. Estimate: %HRR ≈ %VO2 reserve (Swain & Leutholtz 1997), so
 *    VO2max = 3.5 + (walk VO2 − 3.5) / effort.
 *
 * Expect roughly ±15% error, mostly from age-predicted HRmax. Below 40% of
 * heart-rate reserve the walk was too easy to extrapolate from reliably.
 */
import { estimateHrMax } from './vo2max';
import { scoreFromPoints } from '@/lib/scoring/scoringUtils';

export const WALK_PROTOCOL = { speedKmh: 5, gradePct: 10, minutes: 4 } as const;
export const MIN_RELIABLE_EFFORT = 0.4;

export function acsmWalkingVo2(speedKmh: number, gradePct: number): number {
  const metresPerMin = (speedKmh * 1000) / 60;
  return 0.1 * metresPerMin + 1.8 * metresPerMin * (gradePct / 100) + 3.5;
}

export type WalkFitnessEstimate =
  | { status: 'ok'; vo2max: number; effort: number }
  | { status: 'too-easy'; effort: number }
  | { status: 'missing' };

export function estimateVo2maxFromWalk(input: { age: number; restingHr: number; workHr: number }): WalkFitnessEstimate {
  const { age, restingHr, workHr } = input;
  const hrMax = estimateHrMax(age);
  if (!(hrMax > 0) || !(restingHr > 0) || !(workHr > restingHr) || !(hrMax > restingHr)) {
    return { status: 'missing' };
  }
  const effort = Math.min(1, (workHr - restingHr) / (hrMax - restingHr));
  if (effort < MIN_RELIABLE_EFFORT) return { status: 'too-easy', effort };
  const walkVo2 = acsmWalkingVo2(WALK_PROTOCOL.speedKmh, WALK_PROTOCOL.gradePct);
  const vo2max = 3.5 + (walkVo2 - 3.5) / effort;
  return { status: 'ok', vo2max: Math.round(vo2max * 10) / 10, effort };
}

/**
 * Measured treadmill VO2max percentiles, FRIEND registry (Kaminsky, Arena &
 * Myers 2015, Mayo Clin Proc 90:1515, Table 3): 5th, 10th, 25th, 50th, 75th,
 * 90th, 95th by decade. ACSM's Guidelines adopted these reference standards.
 */
const FRIEND_PERCENTILES: Record<'male' | 'female', Record<string, readonly number[]>> = {
  male: {
    '20': [29.0, 32.1, 40.1, 48.0, 55.2, 61.8, 66.3],
    '30': [27.2, 30.2, 35.9, 42.4, 49.2, 56.5, 59.8],
    '40': [24.2, 26.8, 31.9, 37.8, 45.0, 52.1, 55.6],
    '50': [20.9, 22.8, 27.1, 32.6, 39.7, 45.6, 50.7],
    '60': [17.4, 19.8, 23.7, 28.2, 34.5, 40.3, 43.0],
    '70': [16.3, 17.1, 20.4, 24.4, 30.4, 36.6, 39.7],
  },
  female: {
    '20': [21.7, 23.9, 30.5, 37.6, 44.7, 51.3, 56.0],
    '30': [19.0, 20.9, 25.3, 30.2, 36.1, 41.4, 45.8],
    '40': [17.0, 18.8, 22.1, 26.7, 32.4, 38.4, 41.7],
    '50': [16.0, 17.3, 19.9, 23.4, 27.6, 32.0, 35.9],
    '60': [13.4, 14.6, 17.2, 20.0, 23.8, 27.0, 29.4],
    '70': [13.1, 13.6, 15.6, 18.3, 20.8, 23.1, 24.1],
  },
};
const PERCENTILE_SCORES = [5, 10, 25, 50, 75, 90, 100] as const;

/** Score = the client's percentile among people of the same sex and decade (capped 5–100). */
export function scoreVo2maxFriend(vo2max: number, age: number, gender: string): number | null {
  const sex = (gender || '').toLowerCase();
  if (!(vo2max > 0) || !(age > 0) || (sex !== 'male' && sex !== 'female')) return null;
  const decade = String(Math.min(70, Math.max(20, Math.floor(age / 10) * 10)));
  const row = FRIEND_PERCENTILES[sex][decade];
  return Math.round(scoreFromPoints(vo2max, row.map((v, i) => [v, PERCENTILE_SCORES[i]] as const)));
}
