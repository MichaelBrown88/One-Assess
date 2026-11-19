import type { FormData } from '@/contexts/FormContext';
import { safeParse } from '../utils/numbers';
import type { ScoreCategory, ScoreDetail } from './types';
import { clamp, meanOfMeasured, scoreFromPoints } from './scoringUtils';

type Sex = 'male' | 'female';
const asSex = (gender: string): Sex | null => {
  const g = (gender || '').toLowerCase();
  return g === 'male' || g === 'female' ? g : null;
};

/**
 * Healthy body-fat ranges by sex and age (Gallagher et al. 2000, Am J Clin Nutr
 * 72:694, white adults, as reproduced in ACSM's Guidelines): [age below,
 * healthy min, healthy max, overweight max]. Above "overweight max" is obese.
 */
const BODY_FAT_RANGES: Record<Sex, readonly (readonly [number, number, number, number])[]> = {
  male: [[40, 8, 19, 24], [60, 11, 21, 27], [Infinity, 13, 24, 29]],
  female: [[40, 21, 32, 38], [60, 23, 33, 39], [Infinity, 24, 35, 41]],
};

export function scoreBodyFatPct(bodyFat: number, age: number, gender: string): number | null {
  const sex = asSex(gender);
  if (!(bodyFat > 0) || !sex) return null;
  const ranges = BODY_FAT_RANGES[sex];
  const [, low, high, overweight] = ranges.find(([below]) => age < below) ?? ranges[0];
  return Math.round(
    scoreFromPoints(bodyFat, [
      [low - 6, 50], // too lean is not "perfect"
      [low, 90],
      [(low + high) / 2, 100],
      [high, 75], // top of the healthy range
      [overweight + 1, 50], // obese threshold
      [overweight + 11, 10],
    ]),
  );
}

/**
 * Skeletal muscle as a share of body weight against a sex-specific reference
 * (Janssen et al. 2000, J Appl Physiol 89:81: 38.4 ± 5.1 % men, 30.6 ± 5.5 %
 * women). Mean = 75, +1 SD = 100, -1 SD = 50. A planning reference: analyser
 * SMM is not identical to MRI-measured muscle.
 */
const SMM_REFERENCE: Record<Sex, { mean: number; sd: number }> = {
  male: { mean: 0.384, sd: 0.051 },
  female: { mean: 0.306, sd: 0.055 },
};

export function scoreMuscleRatio(smmKg: number, weightKg: number, gender: string): number | null {
  const sex = asSex(gender);
  if (!(smmKg > 0) || !(weightKg > 0) || !sex) return null;
  const { mean, sd } = SMM_REFERENCE[sex];
  return Math.round(clamp(75 + (25 * (smmKg / weightKg - mean)) / sd, 10, 100));
}

/** Waist-to-hip against WHO 2008 cut-offs (men 0.90, women 0.85). */
export function scoreWaistHip(whr: number, gender: string): number | null {
  const sex = asSex(gender);
  if (!(whr > 0) || !sex) return null;
  const cut = sex === 'male' ? 0.9 : 0.85;
  return Math.round(scoreFromPoints(whr, [[cut - 0.05, 100], [cut, 70], [cut + 0.1, 40], [cut + 0.2, 10]]));
}

/** Analyser visceral fat level: 1–9 normal, 10+ excess. */
export function scoreVisceralLevel(level: number): number | null {
  if (!(level > 0)) return null;
  return Math.round(scoreFromPoints(level, [[9, 100], [10, 80], [15, 40], [20, 10]]));
}

/**
 * Score body composition from analyser data. Values that weren't measured stay
 * unmeasured and are left out of the score, strengths and weaknesses.
 */
export function scoreBodyComp(form: FormData, age: number, gender: string): ScoreCategory {
  const weight = safeParse(form.inbodyWeightKg);
  const height = safeParse(form.heightCm);
  const sex = asSex(gender);

  const hasAnalyzerData = !!(form.inbodyBodyFatPct || form.skeletalMuscleMassKg || form.inbodyScore);

  // Scoring uses analyser values only. Tape is progress-only (product rule in
  // AGENTS.md) and nothing is estimated from it: no tape body fat, visceral fat,
  // muscle or waist-to-hip feeds the score.
  const bodyFat = safeParse(form.inbodyBodyFatPct);
  const smm = safeParse(form.skeletalMuscleMassKg);
  const whr = safeParse(form.waistHipRatio);
  const visceral = safeParse(form.visceralFatLevel);

  const bfm = safeParse(form.bodyFatMassKg || (weight > 0 && bodyFat > 0 ? ((weight * bodyFat) / 100).toFixed(1) : '0'));
  const bmr = safeParse(form.bmrKcal);
  const inbodyScore = safeParse(form.inbodyScore);
  const bmi = safeParse(form.inbodyBmi || (weight > 0 && height > 0 ? (weight / ((height / 100) ** 2)).toFixed(1) : '0'));
  const tbw = safeParse(form.totalBodyWaterL);

  const bfScore = scoreBodyFatPct(bodyFat, age, gender);
  const smmScore = scoreMuscleRatio(smm, weight, gender);
  const visceralScore = scoreVisceralLevel(visceral);
  const whrScore = scoreWaistHip(whr, gender);

  const bodyFatDisplay = bodyFat > 0 ? form.inbodyBodyFatPct : '-';
  const smmDisplay = smm > 0 ? form.skeletalMuscleMassKg : '-';
  const visceralDisplay = visceral > 0 ? form.visceralFatLevel : '-';
  const whrDisplay = whr > 0 ? form.waistHipRatio : '-';

  const details: ScoreDetail[] = [
    { id: 'bf', label: 'Body Fat %', value: bodyFatDisplay, unit: '%', score: bfScore ?? 0 },
    { id: 'smm', label: 'Skeletal Muscle Mass', value: smmDisplay, unit: 'kg', score: smmScore ?? 0 },
    { id: 'visceral', label: 'Visceral Fat Level', value: visceralDisplay, score: visceralScore ?? 0 },
    { id: 'bfm', label: 'Body Fat Mass', value: bfm > 0 ? bfm.toFixed(1) : '-', unit: 'kg', score: bfScore ?? 0 },
    { id: 'whr', label: 'Waist-to-Hip Ratio', value: whrDisplay, score: whrScore ?? 0 },
    ...(bmi ? [{ id: 'bmi', label: 'BMI', value: bmi, score: 100 }] as ScoreDetail[] : []),
    ...(tbw ? [{ id: 'tbw', label: 'Total Body Water', value: tbw, unit: 'L', score: 100 }] as ScoreDetail[] : []),
    ...(bmr ? [{ id: 'bmr', label: 'BMR', value: bmr, unit: 'kcal', score: 100 }] as ScoreDetail[] : []),
    ...(inbodyScore ? [{ id: 'inbodyScore', label: 'Body Comp Score', value: inbodyScore, score: clamp(inbodyScore) }] as ScoreDetail[] : []),
  ];

  const mean = meanOfMeasured([bfScore, smmScore, visceralScore, whrScore]);
  const score = mean === null ? 0 : Math.round(mean);
  const assessed = mean !== null || hasAnalyzerData;

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (bfScore !== null && bfScore >= 75) strengths.push('Excellent body fat management');
  else if (bfScore !== null && bfScore >= 60) strengths.push('Body fat within a healthy functional range');

  if (smmScore !== null && smmScore >= 70) strengths.push('Strong skeletal muscle foundation');
  else if (smmScore !== null && smmScore >= 55) strengths.push('Functional muscle mass for your frame');

  const items = [
    { label: 'Body Fat %', score: bfScore },
    { label: 'Muscle Mass', score: smmScore },
    { label: 'Visceral Fat', score: visceralScore },
    { label: 'Waist-to-Hip Ratio', score: whrScore },
  ]
    .filter((i): i is { label: string; score: number } => i.score !== null)
    .sort((a, b) => a.score - b.score);

  items.slice(0, 2).forEach((item) => {
    if (item.score < 60) {
      weaknesses.push(`${item.label} identified as a priority area`);
    } else if (item.score < 75) {
      weaknesses.push(`Optimization of ${item.label} for better performance`);
    }
  });

  return { id: 'bodyComp', title: 'Body Composition', score, assessed, details, strengths, weaknesses };
}
