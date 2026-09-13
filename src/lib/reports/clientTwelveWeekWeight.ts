/**
 * One 12-week weight-loss projection for every AXIS client surface
 * (hero, scorecard, roadmap target, habit deficit line).
 */

import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';
import { parseClientGoals } from '@/lib/goals/goalContext';
import { mergeEffectiveGoalLevels } from '@/lib/goals/systemGoalTargets';
import { buildClientProfile } from '@/lib/physiology/profile';
import { weeklyWeightLossKg } from '@/lib/physiology/rates';
import { safeParse } from '@/lib/utils/numbers';
import { projectWeightLossKg, WEIGHT_LOSS_WEEKS } from '@/lib/reports/weightLossProjection';

export function statedWeightLossKg(
  formData: FormData,
  scores: ScoreSummary | undefined,
  goals: string[] | undefined,
): number {
  const profile = buildClientProfile(formData, scores);
  const { levels } = mergeEffectiveGoalLevels(formData, goals, scores);
  const levelWL = levels.goalLevelWeightLoss;
  if (levelWL.includes('kg')) {
    return safeParse(levelWL.replace('kg', '')) || 5;
  }
  return (profile.bodyWeightKg * (safeParse(levelWL) || 10)) / 100;
}

export function projectClientTwelveWeekWeightLoss(
  formData: FormData,
  scores: ScoreSummary | undefined,
  goals: string[] | undefined,
  currentWeightKg?: number,
): { lossKg: number; endWeightKg: number; weeklyRateKg: number } | null {
  const profile = buildClientProfile(formData, scores);
  const weight = currentWeightKg != null && currentWeightKg > 0 ? currentWeightKg : profile.bodyWeightKg;
  if (!(weight > 0)) return null;

  const ctx = parseClientGoals(formData, goals);
  const targetKg = statedWeightLossKg(formData, scores, goals);
  const rate = weeklyWeightLossKg(profile, targetKg);

  return projectWeightLossKg({
    currentWeightKg: weight,
    weeklyRateKg: rate.rate,
    weeks: WEIGHT_LOSS_WEEKS.twelveWeeks,
    bodyFatPct: profile.bodyFatPct,
    heightCm: profile.heightCm,
    sex: profile.sex,
    protectMuscle: ctx.hasBuildMuscle || ctx.hasBodyRecomp,
  });
}
