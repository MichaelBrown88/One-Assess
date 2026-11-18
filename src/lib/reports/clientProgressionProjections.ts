/**
 * Client report progression columns (Now → end of plan).
 * Uses the same plan-length physiology engine as the hero and roadmap.
 */

import type { FormData } from '@/contexts/FormContext';
import type { ScoreCategory, ScoreSummary } from '@/lib/scoring';
import type { GapAnalysisData } from '@/components/reports/useGapAnalysisData';
import {
  lifestyleFactorForSessions,
  monthlyStrengthGainPct,
  trainingDoseVsThree,
} from '@/lib/physiology/rates';
import { safeParse } from '@/lib/utils/numbers';
import {
  GOAL_IMPROVE_FITNESS,
  parseClientGoals,
} from '@/lib/goals/goalContext';
import type { ClientReportProgressionRow } from '@/lib/reports/clientProgressionRows';
import { CLIENT_METRIC_LABELS } from '@/constants/clientReport';
import { buildClientNinetyDayTarget, type ClientNinetyDayTarget } from './clientNinetyDayTarget';
import {
  PLAN_MONTHS,
  PLAN_VS_TWELVE_WEEKS,
  plannedLiftingSessions,
  prescribedCardioSessions,
  profileForTwelveWeekPlan,
} from '@/lib/reports/plannedTraining';

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round0(n: number): number {
  return Math.round(n);
}

/**
 * Most a training test can grow over the plan at 3 sessions, as a share of today's result.
 * Caps low-baseline changes; this is a planning prior, not an individual outcome guarantee.
 */
const MAX_TRAINING_GAIN_FRACTION_AT_THREE = 0.6;

/** Plan-length training gain: monthly % × plan months, without a minimum forced improvement. */
function twelveWeekTrainingGain(
  current: number,
  monthlyPct: number,
  scale = 1,
  capAbs?: number,
): number {
  const fromPct = current * (monthlyPct / 100) * PLAN_MONTHS * scale;
  const next = current + Math.max(0, fromPct);
  if (capAbs != null) return Math.min(next, current + capAbs);
  return next;
}

/** Optimal cardio markers: projections stop here, and clients already past them hold. */
export const OPTIMAL_FITNESS_SCORE = 97;
export const OPTIMAL_RESTING_HR = 52;
export const OPTIMAL_HEART_RECOVERY = 50;

/** Higher-is-better: improve up to the optimum, never past it and never below today. */
function improveTowardsOptimal(current: number, delta: number, optimal: number): number {
  return Math.max(current, Math.min(optimal, current + delta));
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
  allowZero = false,
): ClientReportProgressionRow | null {
  if (!Number.isFinite(current) || current < 0 || (current === 0 && !allowZero)) return null;
  return {
    name,
    unit,
    baseline: current,
    changeAtPlan: at12w - current,
    current: decimals === 0 ? String(round0(current)) : round1(current).toFixed(decimals),
    twelveWeeks: decimals === 0 ? String(round0(at12w)) : round1(at12w).toFixed(decimals),
  };
}

function tapeRow(name: string, raw: string | undefined, unit: string): ClientReportProgressionRow | null {
  const current = parseFloat(raw || '0');
  if (!Number.isFinite(current) || current <= 0) return null;
  return {
    name,
    unit,
    current: round1(current).toFixed(1),
    twelveWeeks: '–',
  };
}

export function buildTapeMeasurementRows(formData: FormData | undefined): ClientReportProgressionRow[] {
  if (!formData) return [];
  return [
    tapeRow(metricLabel('shoulders'), formData.shouldersCm, 'cm'),
    tapeRow(metricLabel('chest'), formData.chestCm, 'cm'),
    tapeRow(metricLabel('armLeft'), formData.armLeftCm, 'cm'),
    tapeRow(metricLabel('armRight'), formData.armRightCm, 'cm'),
    tapeRow(metricLabel('waist'), formData.waistCm, 'cm'),
    tapeRow(metricLabel('hips'), formData.hipsCm || formData.hipCm, 'cm'),
    tapeRow(metricLabel('thighLeft'), formData.thighLeftCm, 'cm'),
    tapeRow(metricLabel('thighRight'), formData.thighRightCm, 'cm'),
    tapeRow(metricLabel('calfLeft'), formData.calfLeftCm, 'cm'),
    tapeRow(metricLabel('calfRight'), formData.calfRightCm, 'cm'),
  ].filter((r): r is ClientReportProgressionRow => r != null);
}

export function buildBodyCompProgressionRows(
  formData: FormData | undefined,
  scores: ScoreSummary | undefined,
  goals: string[] | undefined,
  _gap?: GapAnalysisData,
  sharedTarget?: ClientNinetyDayTarget | null,
): ClientReportProgressionRow[] {
  if (!formData) return [];
  const target = sharedTarget ?? buildClientNinetyDayTarget(formData, scores, parseClientGoals(formData, goals));
  const body = target?.bodyComposition;
  if (!body) return [];
  return [
    row(metricLabel('bodyWeight'), safeParse(formData.inbodyWeightKg), body.weightKg, 'kg'),
    body.bodyFatPct == null ? null : row(metricLabel('bodyFat'), safeParse(formData.inbodyBodyFatPct), body.bodyFatPct, '%'),
    body.muscleKg == null ? null : row(metricLabel('muscleMass'), safeParse(formData.skeletalMuscleMassKg), body.muscleKg, 'kg'),
  ].filter((r): r is ClientReportProgressionRow => r != null);
}

/**
 * Strength pillar table: upper / lower / grip / core from captured tests
 * (not a blended "muscular endurance" total).
 */
export function buildStrengthProgressionRows(
  formData: FormData | undefined,
  goals: string[] | undefined,
  gap?: GapAnalysisData,
  scores?: ScoreSummary,
): ClientReportProgressionRow[] {
  if (!formData) return [];
  const pushups = safeParse(formData.pushupsOneMinuteReps || formData.pushupMaxReps);
  const squats = safeParse(formData.squatsOneMinuteReps);
  const plank = safeParse(formData.plankDurationSeconds);
  const gripLeft = safeParse(formData.gripLeftKg);
  const gripRight = safeParse(formData.gripRightKg);
  const grip = Math.max(gripLeft, gripRight);
  const hasAny = pushups > 0 || squats > 0 || plank > 0 || grip > 0;
  const capturedZero = [formData.pushupsOneMinuteReps, formData.squatsOneMinuteReps, formData.plankDurationSeconds].some(v => v?.trim() === '0');
  if (!hasAny && !capturedZero) return [];

  // Fall back to AXIS functional gap scores when no captured test data exists.
  const effectivePushups = pushups;
  const effectivePlank = plank;
  const effectiveGrip = grip;

  const ctx = parseClientGoals(formData, goals);
  const profile = profileForTwelveWeekPlan(formData, scores);
  const dose = trainingDoseVsThree(profile.trainingFrequency);
  const span = dose * PLAN_VS_TWELVE_WEEKS;
  const monthlyPct =
    monthlyStrengthGainPct(
      { ...profile, trainingFrequency: 3 },
      { lifestyleSessions: profile.trainingFrequency },
    ).rate * dose;
  const maxGainFraction = MAX_TRAINING_GAIN_FRACTION_AT_THREE * dose;
  const capFor = (current: number, absCap: number) => Math.min(absCap, current * maxGainFraction);

  const rows: ClientReportProgressionRow[] = [];
  const maintain = !ctx.hasBuildStrength && !ctx.hasBuildMuscle && (scores?.categories.find(c => c.id === 'strength')?.score ?? 0) >= 75;

  if (effectivePushups > 0 || formData.pushupsOneMinuteReps?.trim() === '0') {
    const at16 = twelveWeekTrainingGain(
      effectivePushups,
      monthlyPct,
      1,
      capFor(effectivePushups, 28 * span),
    );
    const r = row(metricLabel('upperBody'), effectivePushups, at16, 'reps', 0, true);
    if (r) rows.push(r);
  }

  if (squats > 0 || formData.squatsOneMinuteReps?.trim() === '0') {
    const at16 = twelveWeekTrainingGain(
      squats,
      monthlyPct,
      1,
      capFor(squats, 28 * span),
    );
    const r = row(metricLabel('lowerBody'), squats, at16, 'reps', 0, true);
    if (r) rows.push(r);
  }

  if (effectiveGrip > 0) {
    const at16 = twelveWeekTrainingGain(
      effectiveGrip,
      monthlyPct,
      0.9,
      capFor(effectiveGrip, 8 * span),
    );
    const r = row(metricLabel('grip'), effectiveGrip, at16, grip > 0 ? 'kg' : '', 1);
    if (r) rows.push(r);
  }

  if (effectivePlank > 0 || formData.plankDurationSeconds?.trim() === '0') {
    const at16 = twelveWeekTrainingGain(
      effectivePlank,
      monthlyPct,
      0.9,
      capFor(effectivePlank, 40 * span),
    );
    const r = row(metricLabel('core'), effectivePlank, at16, 'sec', 0, true);
    if (r) rows.push(r);
  }

  const detailIds: Record<string, string> = {
    [metricLabel('upperBody')]: 'pushups', [metricLabel('lowerBody')]: 'squats',
    [metricLabel('grip')]: 'grip', [metricLabel('core')]: 'plank',
  };
  const details = scores?.categories.find(c => c.id === 'strength')?.details ?? [];
  return rows.map(r => {
    const healthySupport = !ctx.hasBuildStrength && (details.find(d => d.id === detailIds[r.name])?.score ?? 0) >= 75;
    return maintain || healthySupport ? { ...r, twelveWeeks: r.current, changeAtPlan: 0 } : r;
  });
}

export function buildCardioProgressionRows(
  formData: FormData | undefined,
  scores: ScoreSummary | undefined,
  goals: string[] | undefined,
  _gap?: GapAnalysisData,
): ClientReportProgressionRow[] {
  if (!formData) return [];
  const peakHrStandalone = safeParse(formData.cardioPeakHr);
  const peakRowStandalone: ClientReportProgressionRow | null =
    peakHrStandalone > 0
      ? {
          name: metricLabel('peakHr'),
          unit: 'bpm',
          current: String(round0(peakHrStandalone)),
          twelveWeeks: '–',
        }
      : null;

  const ctx = parseClientGoals(formData, goals);

  const cardioCat = scores?.categories?.find((c) => c.id === 'cardio');
  const fitnessNow =
    cardioCat?.assessed && cardioCat.score > 0 ? cardioCat.score : 0;
  const isFitnessPrimary = ctx.primaryGoal === GOAL_IMPROVE_FITNESS;
  const hasCardioPlan = prescribedCardioSessions(ctx) > 0 || isFitnessPrimary;
  const sessions = plannedLiftingSessions(formData);
  const lifestyle = lifestyleFactorForSessions(profileForTwelveWeekPlan(formData, scores), sessions);
  const dose = trainingDoseVsThree(sessions);
  const span = dose * PLAN_VS_TWELVE_WEEKS * lifestyle;
  const maxGain = (current: number) => current * MAX_TRAINING_GAIN_FRACTION_AT_THREE * dose;
  const fitnessDelta = Math.min((!hasCardioPlan ? 4 : isFitnessPrimary ? 10 : 8) * span, maxGain(fitnessNow));
  const fitness12 = fitnessNow > 0 ? improveTowardsOptimal(fitnessNow, fitnessDelta, OPTIMAL_FITNESS_SCORE) : 0;

  const rhrCurrent = safeParse(formData.cardioRestingHr);
  const rhrDelta = (!hasCardioPlan ? 3 : isFitnessPrimary ? 8 : 6) * span;
  const rhr12 = -improveTowardsOptimal(-rhrCurrent, rhrDelta, -OPTIMAL_RESTING_HR);

  const recCurrent = formData.cardioPeakHr && formData.cardioPost1MinHr ? Math.max(0, safeParse(formData.cardioPeakHr) - safeParse(formData.cardioPost1MinHr)) : 0;
  const recDelta = Math.min((!hasCardioPlan ? 3 : isFitnessPrimary ? 8 : 6) * span, maxGain(recCurrent));
  const rec12 = improveTowardsOptimal(recCurrent, recDelta, OPTIMAL_HEART_RECOVERY);

  const maintain = !ctx.hasImproveFitness && fitnessNow >= 75;
  return [
    fitnessNow > 0 ? row(metricLabel('vo2'), fitnessNow, fitness12, '', 0) : null,
    row(metricLabel('rhr'), rhrCurrent, rhr12, 'bpm', 0),
    peakRowStandalone,
    row(metricLabel('hrr'), recCurrent, rec12, 'bpm', 0),
  ].filter((r): r is ClientReportProgressionRow => r != null)
    .map(r => maintain && r.twelveWeeks !== '–' ? { ...r, twelveWeeks: r.current, changeAtPlan: 0 } : r);
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
