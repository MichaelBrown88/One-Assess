/**
 * Client report progression columns (Now → 12 weeks).
 * Uses the same 12-week physiology engine as the hero and roadmap.
 */

import type { FormData } from '@/contexts/FormContext';
import type { ScoreCategory, ScoreSummary } from '@/lib/scoring';
import type { GapAnalysisData } from '@/components/reports/useGapAnalysisData';
import { calculateAge } from '@/lib/scoring';
import { buildClientProfile } from '@/lib/physiology/profile';
import { monthlyMuscleGainKg } from '@/lib/physiology/rates';
import { calculateCardioAnalysis, mapFitnessGoalLevel } from '@/lib/utils/cardioAnalysis';
import { safeParse } from '@/lib/utils/numbers';
import {
  GOAL_BUILD_MUSCLE,
  GOAL_IMPROVE_FITNESS,
  GOAL_WEIGHT_LOSS,
  parseClientGoals,
  resolvePillarRole,
} from '@/lib/goals/goalContext';
import { mergeEffectiveGoalLevels } from '@/lib/goals/systemGoalTargets';
import type { ClientReportProgressionRow } from '@/lib/reports/clientProgressionRows';
import { CLIENT_METRIC_LABELS } from '@/constants/clientReport';
import { WEIGHT_LOSS_WEEKS } from '@/lib/reports/weightLossProjection';
import { projectClientTwelveWeekWeightLoss } from '@/lib/reports/clientTwelveWeekWeight';

const YEAR_WEEKS = WEIGHT_LOSS_WEEKS.oneYear;
const TWELVE_FRAC = WEIGHT_LOSS_WEEKS.twelveWeeks / YEAR_WEEKS;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round0(n: number): number {
  return Math.round(n);
}

function metricLabel(key: keyof typeof CLIENT_METRIC_LABELS): string {
  return CLIENT_METRIC_LABELS[key]?.short ?? key;
}

function row(
  name: string,
  current: number,
  at12w: number,
  unit: string,
  decimals = 1,
): ClientReportProgressionRow | null {
  if (!Number.isFinite(current) || current <= 0) return null;
  return {
    name,
    unit,
    current: decimals === 0 ? String(round0(current)) : round1(current).toFixed(decimals),
    twelveWeeks: decimals === 0 ? String(round0(at12w)) : round1(at12w).toFixed(decimals),
  };
}

function projectPctGain(current: number, pct12w: number): number {
  return current * (1 + pct12w / 100);
}

export function buildBodyCompProgressionRows(
  formData: FormData | undefined,
  scores: ScoreSummary | undefined,
  goals: string[] | undefined,
  gap?: GapAnalysisData,
): ClientReportProgressionRow[] {
  if (!gap?.bodyCompGaps || !formData) return [];
  const g = gap.bodyCompGaps;
  const ctx = parseClientGoals(formData, goals);
  const profile = buildClientProfile(formData, scores);

  const weight = g.weight.current;
  const bf = g.fat.current;
  const muscle = g.muscle.current;

  if (ctx.primaryGoal === GOAL_WEIGHT_LOSS || ctx.hasWeightLoss) {
    const projected = projectClientTwelveWeekWeightLoss(formData, scores, goals, weight);
    const loss12 = projected?.lossKg ?? 0;
    const protectMuscle = ctx.hasBuildMuscle || ctx.hasBodyRecomp;
    const weight12 = weight - loss12;

    const fatMassNow = (weight * bf) / 100;
    const fatLoss12 = loss12 * 0.88;
    const fatMass12 = Math.max(fatMassNow - fatLoss12, fatMassNow * 0.35);
    const bf12 = weight12 > 0 ? (fatMass12 / weight12) * 100 : bf;

    const muscleProfile = {
      ...profile,
      trainingFrequency: Math.max(profile.trainingFrequency, 2),
    };
    const muscleRate = monthlyMuscleGainKg(muscleProfile, { concurrentFatLoss: true });
    const muscleGain12 = protectMuscle ? muscleRate.rate * 3 : muscleRate.rate * 3 * 0.4;
    const muscle12 = muscle + muscleGain12;

    return [
      row(metricLabel('bodyWeight'), weight, weight12, 'kg', 1),
      row(metricLabel('bodyFat'), bf, bf12, '%', 1),
      row(metricLabel('muscleMass'), muscle, muscle12, 'kg', 1),
    ].filter((r): r is ClientReportProgressionRow => r != null);
  }

  if (ctx.primaryGoal === GOAL_BUILD_MUSCLE || ctx.hasBuildMuscle) {
    const muscleRate = monthlyMuscleGainKg(profile, { concurrentFatLoss: ctx.hasWeightLoss });
    const muscle12 = muscle + muscleRate.rate * 3;
    const targetBf = g.fat.target > 0 ? g.fat.target : bf;
    const weight12 = weight + (muscle12 - muscle) * 0.85;
    const bf12 = bf - (bf - targetBf) * TWELVE_FRAC;

    return [
      row(metricLabel('muscleMass'), muscle, muscle12, 'kg', 1),
      row(metricLabel('bodyWeight'), weight, weight12, 'kg', 1),
      row(metricLabel('bodyFat'), bf, bf12, '%', 1),
    ].filter((r): r is ClientReportProgressionRow => r != null);
  }

  const targetW = g.weight.target > 0 ? g.weight.target : weight;
  const targetBf = g.fat.target > 0 ? g.fat.target : bf;
  const targetM = g.muscle.target > 0 ? g.muscle.target : muscle;

  return [
    row(metricLabel('bodyFat'), bf, bf - (bf - targetBf) * TWELVE_FRAC, '%', 1),
    row(metricLabel('muscleMass'), muscle, muscle + (targetM - muscle) * TWELVE_FRAC, 'kg', 1),
    row(metricLabel('bodyWeight'), weight, weight + (targetW - weight) * TWELVE_FRAC, 'kg', 1),
  ].filter((r): r is ClientReportProgressionRow => r != null);
}

export function buildStrengthProgressionRows(
  formData: FormData | undefined,
  goals: string[] | undefined,
  gap?: GapAnalysisData,
): ClientReportProgressionRow[] {
  if (!gap?.functionalGaps) return [];
  const g = gap.functionalGaps;
  const ctx = parseClientGoals(formData, goals);
  const isPrimary = resolvePillarRole('strength', ctx) === 'primary';
  const isSecondary = resolvePillarRole('strength', ctx) === 'secondary';

  const pct12w = isPrimary ? 9 : isSecondary ? 6 : 4;

  const rows: ClientReportProgressionRow[] = [];
  const end12 = projectPctGain(g.endurance.current, pct12w);
  const core12 = projectPctGain(g.core.current, pct12w * 0.85);
  const endRow = row(metricLabel('endurance'), g.endurance.current, end12, 'reps', 0);
  const coreRow = row(metricLabel('core'), g.core.current, core12, 'sec', 0);
  if (endRow) rows.push(endRow);
  if (coreRow) rows.push(coreRow);

  if (g.strength) {
    const grip12 = projectPctGain(g.strength.current, pct12w * 0.9);
    const gripRow = row(metricLabel('grip'), g.strength.current, grip12, 'kg', 1);
    if (gripRow) rows.push(gripRow);
  }

  return rows;
}

export function buildCardioProgressionRows(
  formData: FormData | undefined,
  scores: ScoreSummary | undefined,
  goals: string[] | undefined,
  gap?: GapAnalysisData,
): ClientReportProgressionRow[] {
  if (!gap?.cardioGaps || !formData) return [];
  const g = gap.cardioGaps;
  const ctx = parseClientGoals(formData, goals);
  const { levels } = mergeEffectiveGoalLevels(formData, goals, scores);

  const cardioCat = scores?.categories?.find((c) => c.id === 'cardio');
  const fitnessNow =
    cardioCat?.assessed && cardioCat.score > 0 ? cardioCat.score : 0;
  const isFitnessPrimary = ctx.primaryGoal === GOAL_IMPROVE_FITNESS;
  const pct12w = isFitnessPrimary ? 6 : 4;
  const fitness12 = fitnessNow > 0 ? projectPctGain(fitnessNow, pct12w) : 0;

  const age = formData.dateOfBirth ? calculateAge(formData.dateOfBirth) : 35;
  const gender = (formData.gender || 'male').toLowerCase() === 'female' ? 'female' : 'male';
  const cardio = calculateCardioAnalysis(
    age,
    gender,
    mapFitnessGoalLevel(levels.goalLevelFitness),
    safeParse(formData.cardioRestingHr),
    safeParse(formData.cardioPeakHr),
    safeParse(formData.cardioPost1MinHr),
    formData.recentActivity,
    { pillarRole: resolvePillarRole('cardio', ctx) },
  );

  const rhrCurrent = g.rhr.current;
  const rhrTarget = cardio.rhr.target > 0 ? cardio.rhr.target : Math.max(55, rhrCurrent - 8);
  const rhr12 = rhrCurrent - (rhrCurrent - rhrTarget) * TWELVE_FRAC;

  const recCurrent = g.recovery.current;
  const recTarget =
    cardio.recovery.target > recCurrent
      ? cardio.recovery.target
      : recCurrent + Math.max(4, Math.round(recCurrent * 0.15));
  const rec12 = recCurrent + (recTarget - recCurrent) * TWELVE_FRAC;

  return [
    fitnessNow > 0 ? row(metricLabel('vo2'), fitnessNow, fitness12, '', 0) : null,
    row(metricLabel('rhr'), rhrCurrent, rhr12, 'bpm', 0),
    row(metricLabel('hrr'), recCurrent, rec12, 'bpm', 0),
  ].filter((r): r is ClientReportProgressionRow => r != null);
}

export function buildMovementProgressionRows(category: ScoreCategory | undefined): ClientReportProgressionRow[] {
  if (!category?.assessed) return [];
  const score = Math.round(category.score ?? 0);
  if (score <= 0) return [];

  const headroom = 100 - score;
  const at12w = Math.min(100, score + headroom * 0.35);

  return [
    {
      name: 'Movement quality',
      unit: '/ 100',
      current: String(score),
      twelveWeeks: String(round0(at12w)),
    },
  ];
}
