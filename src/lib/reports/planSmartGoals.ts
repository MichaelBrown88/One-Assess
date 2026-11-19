/**
 * Copyable plan SMART goals for the AXIS report.
 * One training dose (planned lifting week). Horizons: 1 calendar month and CLIENT_PLAN_WEEKS.
 */

import type { FormData } from '@/contexts/FormContext';
import { readLowerBody } from '@/lib/scoring/lowerBody';
import type { ScoreSummary } from '@/lib/scoring';
import type { GapAnalysisData } from '@/components/reports/useGapAnalysisData';
import {
  CLIENT_METRIC_LABELS,
  CLIENT_PLAN_WEEKS,
  CLIENT_REPORT_COPY,
  planSmartGoalLine,
} from '@/constants/clientReport';
import { GOAL_IMPROVE_FITNESS, parseClientGoals, resolvePillarRole } from '@/lib/goals/goalContext';
import {
  lifestyleFactorForSessions,
  monthlyStrengthGainPct,
  trainingDoseVsThree,
} from '@/lib/physiology/rates';
import { safeParse } from '@/lib/utils/numbers';
import {
  OPTIMAL_FITNESS_SCORE,
  OPTIMAL_HEART_RECOVERY,
  OPTIMAL_RESTING_HR,
  buildBodyCompProgressionRows,
  buildCardioProgressionRows,
  buildTapeMeasurementRows,
} from '@/lib/reports/clientProgressionProjections';
import {
  PLAN_MONTHS,
  PLAN_VS_TWELVE_WEEKS,
  plannedLiftingSessions,
  prescribedCardioSessions,
  profileForTwelveWeekPlan,
  reportPlanSessions,
  withReportLiftingSessions,
} from '@/lib/reports/plannedTraining';
import {
  CALENDAR_MONTH_WEEKS,
  projectAtCalendarMonth,
  type ClientReportProgressionRow,
} from '@/lib/reports/clientProgressionRows';

export type PlanSmartGoalCategory = 'body-comp' | 'tape' | 'performance';

export interface PlanSmartGoal {
  id: string;
  category: PlanSmartGoalCategory;
  label: string;
  unit: string;
  current: string;
  at1Month: string;
  at16Weeks: string;
  smartLine: string;
}

export { CALENDAR_MONTH_WEEKS };

const MAX_TRAINING_GAIN_FRACTION_AT_THREE = 0.6;

/** Strength battery always shown when assessed (order matches studio P5). */
const STRENGTH_PERFORMANCE_IDS = [
  'perf-pushups',
  'perf-squats',
  'perf-grip',
  'perf-plank',
] as const;

const FITNESS_PERFORMANCE_IDS = ['perf-fitness', 'perf-rhr', 'perf-hrr'] as const;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round0(n: number): number {
  return Math.round(n);
}

function formatValue(n: number, decimals: number): string {
  return decimals === 0 ? String(round0(n)) : round1(n).toFixed(1);
}

function parseDisplayed(value: string): number | null {
  const n = Number(value);
  return value.trim() && Number.isFinite(n) ? n : null;
}

function planTrainingGain(
  current: number,
  monthlyPct: number,
  minAbs: number,
  scale: number,
  capAbs: number,
): number {
  const fromPct = current * (monthlyPct / 100) * PLAN_MONTHS * scale;
  const next = current + Math.max(minAbs, fromPct);
  return Math.min(next, current + capAbs);
}

function improveTowardsOptimal(current: number, delta: number, optimal: number): number {
  return Math.max(current, Math.min(optimal, current + delta));
}

function makeGoal(
  id: string,
  category: PlanSmartGoalCategory,
  label: string,
  unit: string,
  current: string,
  at1Month: string,
  at16Weeks: string,
): PlanSmartGoal {
  return {
    id,
    category,
    label,
    unit,
    current,
    at1Month,
    at16Weeks,
    smartLine: planSmartGoalLine({
      label,
      unit,
      current,
      at1Month,
      at16Weeks,
      planWeeks: CLIENT_PLAN_WEEKS,
    }),
  };
}

function goalFromProgressionRow(
  id: string,
  category: PlanSmartGoalCategory,
  row: ClientReportProgressionRow,
): PlanSmartGoal | null {
  const current = parseDisplayed(row.current);
  if (current == null || current <= 0) return null;
  const at16 = row.twelveWeeks;
  const at1 = row.oneMonth ?? projectAtCalendarMonth(row.current, at16);
  if (at16 === '–' || at16 === '-') return null;
  return makeGoal(id, category, row.name, row.unit ?? '', row.current, at1, at16);
}

function strengthProjectionParams(formData: FormData, goals: string[] | undefined, scores?: ScoreSummary) {
  const ctx = parseClientGoals(formData, goals);
  const isPrimary = resolvePillarRole('strength', ctx) === 'primary';
  const isSecondary = resolvePillarRole('strength', ctx) === 'secondary';
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
  return {
    monthlyPct,
    span,
    minEndurance: Math.round((isPrimary ? 16 : isSecondary ? 12 : 8) * span),
    minCore: Math.round((isPrimary ? 20 : isSecondary ? 15 : 10) * span),
    minGrip: Math.round((isPrimary ? 4 : isSecondary ? 2 : 1.5) * span * 10) / 10,
    capFor,
  };
}

function projectRepTest(
  current: number,
  params: ReturnType<typeof strengthProjectionParams>,
  decimals: number,
): { current: string; at1Month: string; at16Weeks: string } | null {
  if (!(current > 0)) return null;
  const at16 = planTrainingGain(
    current,
    params.monthlyPct,
    params.minEndurance,
    1,
    params.capFor(current, 28 * params.span),
  );
  const at16Str = formatValue(at16, decimals);
  const currentStr = formatValue(current, decimals);
  return {
    current: currentStr,
    at1Month: projectAtCalendarMonth(currentStr, at16Str),
    at16Weeks: at16Str,
  };
}

function projectCoreTest(
  current: number,
  params: ReturnType<typeof strengthProjectionParams>,
): { current: string; at1Month: string; at16Weeks: string } | null {
  if (!(current > 0)) return null;
  const at16 = planTrainingGain(
    current,
    params.monthlyPct,
    params.minCore,
    0.9,
    params.capFor(current, 40 * params.span),
  );
  const at16Str = formatValue(at16, 0);
  const currentStr = formatValue(current, 0);
  return {
    current: currentStr,
    at1Month: projectAtCalendarMonth(currentStr, at16Str),
    at16Weeks: at16Str,
  };
}

function projectGripTest(
  current: number,
  params: ReturnType<typeof strengthProjectionParams>,
): { current: string; at1Month: string; at16Weeks: string } | null {
  if (!(current > 0)) return null;
  const at16 = planTrainingGain(
    current,
    params.monthlyPct,
    params.minGrip,
    0.9,
    params.capFor(current, 8 * params.span),
  );
  const at16Str = formatValue(at16, 1);
  const currentStr = formatValue(current, 1);
  return {
    current: currentStr,
    at1Month: projectAtCalendarMonth(currentStr, at16Str),
    at16Weeks: at16Str,
  };
}

function readGripKg(formData: FormData): number {
  const left = safeParse(formData.gripLeftKg);
  const right = safeParse(formData.gripRightKg);
  const best = Math.max(left, right);
  return best > 0 ? best : 0;
}

function tapeLabel(name: string): string {
  if (name === CLIENT_METRIC_LABELS.armLeft.short) return CLIENT_REPORT_COPY.planSmartGoalBicepLeft;
  if (name === CLIENT_METRIC_LABELS.armRight.short) return CLIENT_REPORT_COPY.planSmartGoalBicepRight;
  return name;
}

function tapeId(name: string): string {
  return `tape-${name.toLowerCase().replace(/\s+/g, '-')}`;
}

function projectTapeSite(
  currentCm: number,
  bodyFatNow: number | null,
  bodyFat16: number | null,
  muscleNow: number | null,
  muscle16: number | null,
  site: 'waist' | 'hips' | 'arm' | 'other',
): { at1Month: string; at16Weeks: string } {
  const currentStr = formatValue(currentCm, 1);
  let at16 = currentCm;

  if (site === 'waist' || site === 'hips') {
    if (bodyFatNow != null && bodyFat16 != null && bodyFatNow > 0 && bodyFat16 < bodyFatNow) {
      const fatDrop = (bodyFatNow - bodyFat16) / bodyFatNow;
      const response = site === 'waist' ? 0.35 : 0.22;
      at16 = currentCm * (1 - fatDrop * response);
    }
  } else if (site === 'arm') {
    if (muscleNow != null && muscle16 != null && muscleNow > 0 && muscle16 > muscleNow) {
      const muscleGainFrac = (muscle16 - muscleNow) / muscleNow;
      at16 = currentCm * (1 + muscleGainFrac * 0.18);
    } else if (bodyFatNow != null && bodyFat16 != null && bodyFatNow > 0 && bodyFat16 < bodyFatNow) {
      const fatDrop = (bodyFatNow - bodyFat16) / bodyFatNow;
      at16 = currentCm * (1 - fatDrop * 0.08);
    }
  } else if (bodyFatNow != null && bodyFat16 != null && bodyFatNow > 0 && bodyFat16 < bodyFatNow) {
    const fatDrop = (bodyFatNow - bodyFat16) / bodyFatNow;
    at16 = currentCm * (1 - fatDrop * 0.12);
  }

  const at16Str = formatValue(Math.max(at16, currentCm * 0.85), 1);
  return {
    at1Month: projectAtCalendarMonth(currentStr, at16Str),
    at16Weeks: at16Str,
  };
}

function classifyTapeSite(name: string): 'waist' | 'hips' | 'arm' | 'other' {
  if (name === CLIENT_METRIC_LABELS.waist.short) return 'waist';
  if (name === CLIENT_METRIC_LABELS.hips.short) return 'hips';
  if (
    name === CLIENT_METRIC_LABELS.armLeft.short ||
    name === CLIENT_METRIC_LABELS.armRight.short
  ) {
    return 'arm';
  }
  return 'other';
}

/**
 * Strength battery first (upper, lower, grip, core), then fitness metrics when assessed.
 * No artificial cap that drops grip.
 */
function pickPerformanceIds(): string[] {
  return [...STRENGTH_PERFORMANCE_IDS, ...FITNESS_PERFORMANCE_IDS];
}

function buildPerformanceCandidates(
  formData: FormData,
  scores: ScoreSummary | undefined,
  goals: string[] | undefined,
  gapAnalysisData: GapAnalysisData[],
): PlanSmartGoal[] {
  const params = strengthProjectionParams(formData, goals, scores);
  const candidates: PlanSmartGoal[] = [];

  const pushups = safeParse(formData.pushupsOneMinuteReps);
  const pushProj = projectRepTest(pushups, params, 0);
  if (pushProj) {
    candidates.push(
      makeGoal(
        'perf-pushups',
        'performance',
        CLIENT_REPORT_COPY.planSmartGoalPushups,
        'reps',
        pushProj.current,
        pushProj.at1Month,
        pushProj.at16Weeks,
      ),
    );
  }

  const lowerBody = readLowerBody(formData);
  const squats = lowerBody?.reps ?? 0;
  const squatProj = projectRepTest(squats, params, Number.isInteger(squats) ? 0 : 1);
  if (squatProj) {
    candidates.push(
      makeGoal(
        'perf-squats',
        'performance',
        CLIENT_REPORT_COPY.planSmartGoalSquats,
        'reps',
        squatProj.current,
        squatProj.at1Month,
        squatProj.at16Weeks,
      ),
    );
  }

  const grip = readGripKg(formData);
  const gripProj = projectGripTest(grip, params);
  if (gripProj) {
    candidates.push(
      makeGoal(
        'perf-grip',
        'performance',
        CLIENT_REPORT_COPY.planSmartGoalGrip,
        'kg',
        gripProj.current,
        gripProj.at1Month,
        gripProj.at16Weeks,
      ),
    );
  }

  const plank = safeParse(formData.plankDurationSeconds);
  const plankProj = projectCoreTest(plank, params);
  if (plankProj) {
    candidates.push(
      makeGoal(
        'perf-plank',
        'performance',
        CLIENT_REPORT_COPY.planSmartGoalPlank,
        'sec',
        plankProj.current,
        plankProj.at1Month,
        plankProj.at16Weeks,
      ),
    );
  }

  const cardioGap = gapAnalysisData[2];
  const cardioRows = buildCardioProgressionRows(formData, scores, goals, cardioGap);
  const fitness = cardioRows.find((r) => r.name === CLIENT_METRIC_LABELS.vo2.short);
  const rhr = cardioRows.find((r) => r.name === CLIENT_METRIC_LABELS.rhr.short);
  const hrr = cardioRows.find((r) => r.name === CLIENT_METRIC_LABELS.hrr.short);

  // Re-project cardio with optimal caps so SMART lines match the pillar gap table.
  const ctx = parseClientGoals(formData, goals);
  const sessions = plannedLiftingSessions(formData);
  const lifestyle = lifestyleFactorForSessions(profileForTwelveWeekPlan(formData, scores), sessions);
  const dose = trainingDoseVsThree(sessions);
  const span = dose * PLAN_VS_TWELVE_WEEKS * lifestyle;
  const isFitnessPrimary = ctx.primaryGoal === GOAL_IMPROVE_FITNESS;
  const hasCardioPlan = prescribedCardioSessions(ctx) > 0 || isFitnessPrimary;
  const maxGain = (current: number) => current * MAX_TRAINING_GAIN_FRACTION_AT_THREE * dose;

  if (fitness) {
    const fromRow = goalFromProgressionRow('perf-fitness', 'performance', fitness);
    if (fromRow) candidates.push(fromRow);
  } else {
    const cardioCat = scores?.categories?.find((c) => c.id === 'cardio');
    const fitnessNow = cardioCat?.assessed && cardioCat.score > 0 ? cardioCat.score : 0;
    if (fitnessNow > 0) {
      const fitnessDelta = Math.min(
        (!hasCardioPlan ? 4 : isFitnessPrimary ? 10 : 8) * span,
        maxGain(fitnessNow),
      );
      const at16 = improveTowardsOptimal(fitnessNow, fitnessDelta, OPTIMAL_FITNESS_SCORE);
      const currentStr = formatValue(fitnessNow, 0);
      const at16Str = formatValue(at16, 0);
      candidates.push(
        makeGoal(
          'perf-fitness',
          'performance',
          CLIENT_METRIC_LABELS.vo2.short,
          '',
          currentStr,
          projectAtCalendarMonth(currentStr, at16Str),
          at16Str,
        ),
      );
    }
  }

  if (rhr) {
    const fromRow = goalFromProgressionRow('perf-rhr', 'performance', rhr);
    if (fromRow) candidates.push(fromRow);
  } else if (cardioGap?.cardioGaps?.rhr.current) {
    const rhrCurrent = cardioGap.cardioGaps.rhr.current;
    const rhrDelta = (!hasCardioPlan ? 3 : isFitnessPrimary ? 8 : 6) * span;
    const at16 = -improveTowardsOptimal(-rhrCurrent, rhrDelta, -OPTIMAL_RESTING_HR);
    const currentStr = formatValue(rhrCurrent, 0);
    const at16Str = formatValue(at16, 0);
    candidates.push(
      makeGoal(
        'perf-rhr',
        'performance',
        CLIENT_METRIC_LABELS.rhr.short,
        'bpm',
        currentStr,
        projectAtCalendarMonth(currentStr, at16Str),
        at16Str,
      ),
    );
  }

  if (hrr) {
    const fromRow = goalFromProgressionRow('perf-hrr', 'performance', hrr);
    if (fromRow) candidates.push(fromRow);
  } else if (cardioGap?.cardioGaps?.recovery.current) {
    const recCurrent = cardioGap.cardioGaps.recovery.current;
    const recDelta = Math.min((!hasCardioPlan ? 3 : isFitnessPrimary ? 8 : 6) * span, maxGain(recCurrent));
    const at16 = improveTowardsOptimal(recCurrent, recDelta, OPTIMAL_HEART_RECOVERY);
    const currentStr = formatValue(recCurrent, 0);
    const at16Str = formatValue(at16, 0);
    candidates.push(
      makeGoal(
        'perf-hrr',
        'performance',
        CLIENT_METRIC_LABELS.hrr.short,
        'bpm',
        currentStr,
        projectAtCalendarMonth(currentStr, at16Str),
        at16Str,
      ),
    );
  }

  return candidates;
}

/**
 * Build plan targets from the same physiology path as pillar gap tables.
 * Locks the form to the report plan week (4, or 5 if they already train 5+).
 */
export function buildPlanSmartGoals(
  formData: FormData | undefined,
  scores: ScoreSummary | undefined,
  goals: string[] | undefined,
  gapAnalysisData: GapAnalysisData[],
): PlanSmartGoal[] {
  if (!formData) return [];

  const planSessions = reportPlanSessions(formData);
  const planned = withReportLiftingSessions(formData, planSessions);
  const bodyGap = gapAnalysisData[0];

  const goalsOut: PlanSmartGoal[] = [];

  const bodyRows = buildBodyCompProgressionRows(planned, scores, goals, bodyGap);
  for (const row of bodyRows) {
    const id =
      row.name === CLIENT_METRIC_LABELS.bodyWeight.short
        ? 'bc-weight'
        : row.name === CLIENT_METRIC_LABELS.bodyFat.short
          ? 'bc-fat'
          : row.name === CLIENT_METRIC_LABELS.muscleMass.short
            ? 'bc-muscle'
            : `bc-${row.name.toLowerCase().replace(/\s+/g, '-')}`;
    const goal = goalFromProgressionRow(id, 'body-comp', {
      ...row,
      oneMonth: projectAtCalendarMonth(row.current, row.twelveWeeks),
    });
    if (goal) goalsOut.push(goal);
  }

  const fatRow = bodyRows.find((r) => r.name === CLIENT_METRIC_LABELS.bodyFat.short);
  const muscleRow = bodyRows.find((r) => r.name === CLIENT_METRIC_LABELS.muscleMass.short);
  const bfNow = fatRow ? parseDisplayed(fatRow.current) : null;
  const bf16 = fatRow ? parseDisplayed(fatRow.twelveWeeks) : null;
  const muscleNow = muscleRow ? parseDisplayed(muscleRow.current) : null;
  const muscle16 = muscleRow ? parseDisplayed(muscleRow.twelveWeeks) : null;

  // Prefer waist/hips first, then other measured sites (arms as biceps in copy).
  const tapeRows = buildTapeMeasurementRows(planned);
  const tapeOrder = (name: string): number => {
    if (name === CLIENT_METRIC_LABELS.waist.short) return 0;
    if (name === CLIENT_METRIC_LABELS.hips.short) return 1;
    if (name === CLIENT_METRIC_LABELS.armLeft.short || name === CLIENT_METRIC_LABELS.armRight.short) {
      return 2;
    }
    return 3;
  };
  const orderedTape = [...tapeRows].sort((a, b) => tapeOrder(a.name) - tapeOrder(b.name));

  for (const row of orderedTape) {
    const current = parseDisplayed(row.current);
    if (current == null || current <= 0) continue;
    const site = classifyTapeSite(row.name);
    const projected = projectTapeSite(current, bfNow, bf16, muscleNow, muscle16, site);
    const label = tapeLabel(row.name);
    goalsOut.push(
      makeGoal(tapeId(label), 'tape', label, 'cm', row.current, projected.at1Month, projected.at16Weeks),
    );
  }

  const performance = buildPerformanceCandidates(planned, scores, goals, gapAnalysisData);
  const byId = new Map(performance.map((g) => [g.id, g]));
  const picked: PlanSmartGoal[] = [];
  for (const id of pickPerformanceIds()) {
    const goal = byId.get(id);
    if (!goal) continue;
    picked.push(goal);
  }
  goalsOut.push(...picked);

  return goalsOut;
}
