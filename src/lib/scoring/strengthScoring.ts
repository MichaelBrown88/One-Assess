import type { FormData } from '@/contexts/FormContext';
import { safeParse } from '../utils/numbers';
import type { ScoreCategory, ScoreDetail } from './types';
import { clamp, lookupNormativeScore, meanOfMeasured, scoreFromPoints } from './scoringUtils';
import { assessSideImbalance } from './sideImbalance';
import { readLowerBody, scoreSingleLegSitToStand } from './lowerBody';

/**
 * Grip compared with the healthy young-adult peak (Dodds et al. 2014, PLOS ONE
 * 9:e113637): mean (SD) 51.9 (9.9) kg men, 31.4 (6.1) kg women. Peak mean = 75,
 * +1 SD = 100, -1 SD = 50, T-score -2 (32 / 19 kg) = 25, T-score -2.5
 * (27 / 16 kg, the EWGSOP2 weak-grip cut-off) = 10. Not age-adjusted on purpose:
 * this is the standard used to flag weak grip at any age.
 */
const GRIP_POINTS: Record<'male' | 'female', readonly (readonly [number, number])[]> = {
  male: [[27, 10], [32, 25], [42, 50], [51.9, 75], [61.8, 100]],
  female: [[16, 10], [19, 25], [25.3, 50], [31.4, 75], [37.5, 100]],
};

/**
 * Plank: forearm plank to form failure, compared with healthy young adults
 * (Strand et al. 2014, J Hum Kinet 40:93, Table 3, non-varsity students:
 * 10th-90th percentiles). Score = percentile. The test stops at 3:00, so a man
 * tops out around the 88th percentile; women reach 100 at 3:00. No age
 * adjustment (no published age norms; same young-adult approach as grip).
 * Body mass correlates only weakly (r about -0.3), so it isn't adjusted for.
 */
export const PLANK_CAP_SECONDS = 180;
const PLANK_POINTS: Record<'male' | 'female', readonly (readonly [number, number])[]> = {
  male: [[0, 0], [49, 10], [72, 20], [83, 30], [95, 40], [103, 50], [115, 60], [125, 70], [142, 80], [189, 90]],
  female: [[0, 0], [34, 10], [47, 20], [56, 30], [62, 40], [70, 50], [79, 60], [91, 70], [103, 80], [130, 90], [180, 100]],
};

export function scorePlankStrand(seconds: number, gender: string): number | null {
  const sex = (gender || '').toLowerCase();
  if (seconds < 0 || (sex !== 'male' && sex !== 'female')) return null;
  return Math.round(scoreFromPoints(Math.min(seconds, PLANK_CAP_SECONDS), PLANK_POINTS[sex]));
}

export function scoreGripKg(kg: number, gender: string): number | null {
  const sex = (gender || '').toLowerCase();
  if (!(kg > 0) || (sex !== 'male' && sex !== 'female')) return null;
  return Math.round(scoreFromPoints(kg, GRIP_POINTS[sex]));
}

export function scoreStrength(form: FormData, age: number, gender: string): ScoreCategory {
  const pushups = safeParse(form.pushupsOneMinuteReps);
  // Lower body: single-leg sit-to-stand (average of both legs), or legacy squats.
  const lowerBody = readLowerBody(form);
  const plank = safeParse(form.plankDurationSeconds);

  const hasPushups = !!(form.pushupsOneMinuteReps && form.pushupsOneMinuteReps.trim() !== '');
  const hasLowerBody = lowerBody !== null;
  const hasPlank = !!(form.plankDurationSeconds && form.plankDurationSeconds.trim() !== '');

  // Check grip strength methods
  const hasGripDynamometer = !!(form.gripLeftKg && form.gripLeftKg.trim() !== '' && safeParse(form.gripLeftKg) > 0) ||
                              !!(form.gripRightKg && form.gripRightKg.trim() !== '' && safeParse(form.gripRightKg) > 0);
  // Only a dynamometer gives a real kg figure. Dead hang, farmer's walk and
  // plate pinch used to be turned into kg with invented conversions, so they
  // are no longer scored as grip.
  const hasGrip = hasGripDynamometer;
  const hands = [safeParse(form.gripLeftKg), safeParse(form.gripRightKg)].filter((v) => v > 0);
  // Average only the hands that were tested (one hand alone used to be halved).
  const gripAvg = hands.length > 0 ? hands.reduce((a, b) => a + b, 0) / hands.length : 0;

  // Normative scores. null = not measured or can't be scored (e.g. no age),
  // so it is left out of the average instead of counting as 0.
  const normed = (test: string, value: number) => {
    const v = lookupNormativeScore(test, gender, age, value);
    return v > 0 ? v : null;
  };
  // The ACSM tables cover men on the toes and women on the knees. Any other
  // combination has no published norms, so it is recorded but not scored.
  const sex = (gender || '').toLowerCase();
  const pushupType = (form.pushupType || '').toLowerCase();
  const pushupHasNorms =
    (sex === 'male' && pushupType !== 'knees') || (sex === 'female' && pushupType !== 'full');
  const pushScore = hasPushups && pushupHasNorms ? normed('Push-up', pushups) : null;
  const plankScore = hasPlank ? scorePlankStrand(plank, gender) : null;
  const lowerScore = !lowerBody
    ? null
    : lowerBody.protocol === 'single-leg-sts-30sec'
      ? scoreSingleLegSitToStand(lowerBody.reps, age, gender)
      : clamp(lowerBody.reps * 2.5);
  const gripScore = hasGrip ? scoreGripKg(gripAvg, gender) : null;

  const details: ScoreDetail[] = [
    { id: 'pushups', label: pushupType === 'knees' ? 'Pushups on knees (1-min)' : 'Pushups (1-min)', value: pushups || '-', score: Math.round(pushScore ?? 0) },
    { id: 'plank', label: 'Plank hold', value: plank || '-', unit: 's', score: Math.round(plankScore ?? 0) },
  ];

  if (lowerBody) {
    details.splice(1, 0, lowerBody.protocol === 'single-leg-sts-30sec'
      ? { id: 'singleLeg', label: 'Single-leg sit-to-stand (30 s, avg per leg)', value: lowerBody.reps, unit: 'reps', score: Math.round(lowerScore ?? 0) }
      : { id: 'squats', label: 'Squats (1-min)', value: lowerBody.reps, score: Math.round(lowerScore ?? 0) });
  }

  if (hasGrip) {
    details.push({ id: 'grip', label: 'Grip (avg)', value: Math.round(gripAvg * 10) / 10 || '-', unit: 'kg', score: Math.round(gripScore ?? 0) });
  }

  const subScores = [pushScore, lowerScore, plankScore, gripScore];
  const mean = meanOfMeasured(subScores);
  const score = mean === null ? 0 : Math.round(mean);

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (score >= 85) strengths.push('Exceptional foundational strength and power');
  else if (score >= 70) strengths.push('Strong muscular endurance baseline');

  const items = [
    { label: 'Upper Body Endurance', score: pushScore },
    { label: 'Lower Body Endurance', score: lowerScore },
    { label: 'Core Stability', score: plankScore },
    { label: 'Grip Strength', score: gripScore }
  ].filter((i): i is { label: string; score: number } => i.score !== null)
   .sort((a, b) => a.score - b.score);

  items.slice(0, 2).forEach(item => {
    if (item.score < 60) {
      weaknesses.push(`${item.label} identified as a structural priority`);
    } else {
      weaknesses.push(`Optimization of ${item.label} for peak performance`);
    }
  });

  // Left/right imbalances lead the focus list: they change how we train.
  const legGap = lowerBody?.protocol === 'single-leg-sts-30sec'
    ? assessSideImbalance(form.singleLegStandLeftReps, form.singleLegStandRightReps)
    : null;
  if (legGap?.material) {
    const side = legGap.weakSide === 'left' ? 'Left' : 'Right';
    weaknesses.unshift(`${side} leg managed ${legGap.gapPct}% fewer single-leg reps than the ${legGap.strongSide}`);
  }
  const gripGap = hasGripDynamometer ? assessSideImbalance(form.gripLeftKg, form.gripRightKg) : null;
  if (gripGap?.material) {
    const side = gripGap.weakSide === 'left' ? 'Left' : 'Right';
    weaknesses.unshift(`${side} side grip is ${gripGap.gapPct}% weaker than the ${gripGap.strongSide}`);
  }

  if (score >= 75 && subScores.filter((x) => x !== null).length >= 2) strengths.push('Balanced muscular development across tests');

  const assessed = hasPushups || hasLowerBody || hasPlank || hasGrip;

  return { id: 'strength', title: 'Functional Strength', score, assessed, details, strengths, weaknesses };
}
