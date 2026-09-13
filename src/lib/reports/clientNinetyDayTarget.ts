/**
 * Achievable 12-week body-weight target + daily macro guidance for the
 * client roadmap (lead-magnet). Weight uses the same 12-week engine as the
 * hero and scorecard. Macros come from a Mifflin-St Jeor TDEE with a
 * goal-appropriate calorie adjustment. Protein is from body weight.
 */

import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring/types';
import type { ClientGoalContext } from '@/lib/goals/goalContext';
import { buildClientProfile } from '@/lib/physiology/profile';
import { weeklyWeightLossKg, monthlyMuscleGainKg } from '@/lib/physiology/rates';
import { projectClientTwelveWeekWeightLoss } from '@/lib/reports/clientTwelveWeekWeight';

const KCAL_PER_KG_FAT = 7700;

export type TargetDirection = 'lose' | 'gain' | 'maintain';

export interface ClientNinetyDayTarget {
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  weightDeltaKg: number | null;
  direction: TargetDirection;
  /** Daily calorie target (rounded to nearest 25). */
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
}

function num(v: string | undefined): number {
  const n = parseFloat(v ?? '');
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function ageFromDob(dob: string | undefined): number {
  if (!dob) return 0;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return 0;
  const years = (Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return years > 0 && years < 120 ? Math.floor(years) : 0;
}

/** Activity multiplier on BMR from committed training frequency. */
function activityFactor(freq: number): number {
  if (freq <= 0) return 1.3;
  if (freq <= 2) return 1.45;
  if (freq <= 4) return 1.55;
  return 1.7;
}

function targetWeight(
  formData: FormData,
  scores: ScoreSummary | undefined,
  ctx: ClientGoalContext,
  current: number,
  muscleGainPerMonth: number,
): number {
  if (ctx.hasWeightLoss) {
    const projected = projectClientTwelveWeekWeightLoss(formData, scores, ctx.allGoals, current);
    return projected?.endWeightKg ?? current;
  }
  if (ctx.hasBuildMuscle) {
    return current + muscleGainPerMonth * 3;
  }
  return current;
}

function calorieTarget(
  tdee: number,
  direction: TargetDirection,
  lossRatePerWeek: number,
): number {
  if (direction === 'lose') {
    const dailyDeficit = Math.min((lossRatePerWeek * KCAL_PER_KG_FAT) / 7, tdee * 0.28);
    return tdee - dailyDeficit;
  }
  if (direction === 'gain') {
    return tdee + Math.min(tdee * 0.12, 350);
  }
  return tdee;
}

export function buildClientNinetyDayTarget(
  formData: FormData | undefined,
  scores: ScoreSummary | undefined,
  ctx: ClientGoalContext,
): ClientNinetyDayTarget | null {
  if (!formData) return null;

  const current = num(formData.inbodyWeightKg);
  if (current <= 0) return null;

  const profile = buildClientProfile(formData, scores);
  const twelveWeekLoss = projectClientTwelveWeekWeightLoss(formData, scores, ctx.allGoals, current);
  const lossRate = twelveWeekLoss?.weeklyRateKg ?? weeklyWeightLossKg(profile, 10).rate;
  const muscleGain = monthlyMuscleGainKg(profile, {
    concurrentFatLoss: ctx.hasWeightLoss && ctx.hasBuildMuscle,
  }).rate;

  const rawTarget = targetWeight(formData, scores, ctx, current, muscleGain);
  const targetKg = Math.round(rawTarget * 10) / 10;
  const deltaKg = Math.round((targetKg - current) * 10) / 10;
  const direction: TargetDirection =
    deltaKg <= -0.3 ? 'lose' : deltaKg >= 0.3 ? 'gain' : 'maintain';

  // ── Macros (need height + age for a credible Mifflin-St Jeor estimate) ──
  const height = num(formData.heightCm);
  const age = ageFromDob(formData.dateOfBirth) || 30;
  const gender = (formData.gender || 'male').toLowerCase() === 'female' ? 'female' : 'male';

  let calories: number | null = null;
  let proteinG: number | null = null;
  let carbsG: number | null = null;
  let fatG: number | null = null;

  if (height > 0) {
    let bmr = num(formData.bmrKcal);
    if (bmr < 800 || bmr > 3500) {
      bmr = 10 * current + 6.25 * height - 5 * age + (gender === 'female' ? -161 : 5);
    }
    const tdee = bmr * activityFactor(profile.trainingFrequency);
    const rawCalories = calorieTarget(tdee, direction, lossRate);

    const proteinPerKg = direction === 'lose' ? 2.0 : 1.8;
    proteinG = roundTo(current * proteinPerKg, 5);

    fatG = roundTo(current * 0.8, 5);

    calories = roundTo(rawCalories, 25);
    const carbCalories = calories - proteinG * 4 - fatG * 9;
    carbsG = Math.max(50, roundTo(carbCalories / 4, 5));
  }

  return {
    currentWeightKg: Math.round(current * 10) / 10,
    targetWeightKg: targetKg,
    weightDeltaKg: deltaKg,
    direction,
    calories,
    proteinG,
    carbsG,
    fatG,
  };
}
