import type { FormData } from '@/contexts/FormContext';
import { safeParse } from '../utils/numbers';
import type { ScoreCategory, ScoreDetail } from './types';
import { clamp, lookupNormativeScore, meanOfMeasured, scoreFromPoints } from './scoringUtils';

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

export function scoreGripKg(kg: number, gender: string): number | null {
  const sex = (gender || '').toLowerCase();
  if (!(kg > 0) || (sex !== 'male' && sex !== 'female')) return null;
  return Math.round(scoreFromPoints(kg, GRIP_POINTS[sex]));
}

export function scoreStrength(form: FormData, age: number, gender: string): ScoreCategory {
  const pushups = safeParse(form.pushupsOneMinuteReps);
  const squats = safeParse(form.squatsOneMinuteReps);
  const plank = safeParse(form.plankDurationSeconds);

  const hasPushups = !!(form.pushupsOneMinuteReps && form.pushupsOneMinuteReps.trim() !== '');
  const hasSquats = !!(form.squatsOneMinuteReps && form.squatsOneMinuteReps.trim() !== '');
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
  const pushScore = hasPushups ? normed('Push-up', pushups) : null;
  const plankScore = hasPlank ? normed('Plank Hold', plank) : null;
  const squatScore = hasSquats ? clamp(squats * 2.5) : null;
  const gripScore = hasGrip ? scoreGripKg(gripAvg, gender) : null;

  const details: ScoreDetail[] = [
    { id: 'pushups', label: 'Pushups (1-min)', value: pushups || '-', score: Math.round(pushScore ?? 0) },
    { id: 'squats', label: 'Squats (1-min)', value: squats || '-', score: Math.round(squatScore ?? 0) },
    { id: 'plank', label: 'Plank hold', value: plank || '-', unit: 's', score: Math.round(plankScore ?? 0) },
  ];

  if (hasGrip) {
    details.push({ id: 'grip', label: 'Grip (avg)', value: Math.round(gripAvg * 10) / 10 || '-', unit: 'kg', score: Math.round(gripScore ?? 0) });
  }

  const subScores = [pushScore, squatScore, plankScore, gripScore];
  const mean = meanOfMeasured(subScores);
  const score = mean === null ? 0 : Math.round(mean);

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (score >= 85) strengths.push('Exceptional foundational strength and power');
  else if (score >= 70) strengths.push('Strong muscular endurance baseline');

  const items = [
    { label: 'Upper Body Endurance', score: pushScore },
    { label: 'Lower Body Endurance', score: squatScore },
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

  if (score >= 75 && subScores.filter((x) => x !== null).length >= 2) strengths.push('Balanced muscular development across tests');

  const assessed = hasPushups || hasSquats || hasPlank || hasGrip;

  return { id: 'strength', title: 'Functional Strength', score, assessed, details, strengths, weaknesses };
}
