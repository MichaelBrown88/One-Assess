/** Single body-composition and nutrition calculation for the client report. */
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring/types';
import type { ClientGoalContext } from '@/lib/goals/goalContext';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { monthlyMuscleGainKg } from '@/lib/physiology/rates';
import { PLAN_CALENDAR_MONTHS, PLAN_MONTHS, PLAN_WEEKS, plannedLiftingSessions,
  profileForTwelveWeekPlan, withReportLiftingSessions } from './plannedTraining';
import { projectClientTwelveWeekWeightLoss } from './clientTwelveWeekWeight';
import { bodyFatFloorFraction } from './weightLossProjection';

const KCAL_PER_KG_FAT = 7700;
const CUT_PROTEIN = 2.2;
const MAINTENANCE_PROTEIN = 1.8;
const FAT_G_PER_KG = 0.8;
const DEFICIT_CAP = 0.25;
const MIN_DAILY_KCAL = { female: 1200, male: 1500 } as const;
const MACRO_REFERENCE_MAX_BMI = 30;

export type TargetDirection = 'lose' | 'gain' | 'maintain';
export interface BodyCompositionPlan {
  weightKg: number;
  fatKg: number | null;
  bodyFatPct: number | null;
  muscleKg: number | null;
  /** Assumption: non-muscle fat-free mass stays stable, not an extra growth forecast. */
  otherLeanKg: number | null;
}
export interface ClientNinetyDayTarget {
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  weightDeltaKg: number | null;
  monthlyWeightChangeKg: number | null;
  direction: TargetDirection;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fuelSessionsNote: string | null;
  macroNote?: string | null;
  bodyComposition?: BodyCompositionPlan;
}
function positive(value: string | undefined): number | null {
  const n = Number(value);
  return value?.trim() && Number.isFinite(n) && n > 0 ? n : null;
}
function roundTo(value: number, step: number): number { return Math.round(value / step) * step; }
function round1(value: number): number { return Math.sign(value) * Math.round(Math.abs(value) * 10) / 10; }

export function buildClientNinetyDayTarget(
  formData: FormData | undefined, scores: ScoreSummary | undefined, ctx: ClientGoalContext,
): ClientNinetyDayTarget | null {
  if (!formData) return null;
  const current = positive(formData.inbodyWeightKg);
  if (current == null) return null;
  const profile = profileForTwelveWeekPlan(formData, scores);
  const sessions = plannedLiftingSessions(formData);
  const height = positive(formData.heightCm);
  const bfInput = positive(formData.inbodyBodyFatPct);
  const bf = bfInput != null && bfInput < 70 ? bfInput : null;
  const fatNow = bf == null ? null : current * bf / 100;
  const leanNow = fatNow == null ? null : current - fatNow;
  const muscleInput = positive(formData.skeletalMuscleMassKg);
  const muscle = muscleInput != null && (leanNow == null || muscleInput < leanNow) ? muscleInput : null;
  const muscleGoal = ctx.hasBuildMuscle || ctx.hasBodyRecomp;
  const projected = ctx.hasWeightLoss
    ? projectClientTwelveWeekWeightLoss(formData, scores, ctx.allGoals, current) : null;
  let loss = projected?.lossKg ?? 0;
  let calories: number | null = null;
  let proteinG: number | null = null;
  let carbsG: number | null = null;
  let fatG: number | null = null;
  let macroNote: string | null = null;
  // Unknown age/sex is not silently treated as a 30-year-old male nutrition prescription.
  const ageKnown = !!formData.dateOfBirth && Number.isFinite(Date.parse(formData.dateOfBirth));
  const canFuel = height != null && height >= 120 && height <= 230 && ageKnown
    && profile.age >= 18 && profile.sex !== 'unknown';
  let tdee: number | null = null;
  if (canFuel) {
    const sex = profile.sex === 'female' ? 'female' : 'male';
    const bmr = 10 * current + 6.25 * height - 5 * profile.age + (sex === 'female' ? -161 : 5);
    // Modest planning prior, not a measured expenditure. Extra visits add activity on the same food.
    const baseTdee = bmr * 1.55;
    tdee = baseTdee + Math.max(0, sessions - 4) * bmr * 0.035;
    const floor = Math.min(tdee, Math.max(bmr, MIN_DAILY_KCAL[sex]));
    const baseLoss = ctx.hasWeightLoss
      ? projectClientTwelveWeekWeightLoss(withReportLiftingSessions(formData, 4), scores, ctx.allGoals, current)?.lossKg ?? 0 : 0;
    const baseDeficit = baseLoss / PLAN_WEEKS * KCAL_PER_KG_FAT / 7;
    const rawFood = loss > 0
      ? Math.max(floor, baseTdee - Math.min(baseDeficit, baseTdee * DEFICIT_CAP))
      : tdee + (ctx.hasBuildMuscle && !ctx.hasWeightLoss && !ctx.hasBodyRecomp ? Math.min(tdee * 0.05, 150) : 0);
    calories = Math.max(Math.ceil(floor / 25) * 25, roundTo(rawFood, 25));
    // A calorie floor must constrain the displayed loss as well as the food strip.
    const energyLoss = Math.max(0, tdee - calories) * 7 / KCAL_PER_KG_FAT * PLAN_WEEKS;
    loss = Math.min(loss, energyLoss);
  }

  let muscleGain = muscleGoal && muscle != null ? monthlyMuscleGainKg(profile, {
    concurrentFatLoss: ctx.hasWeightLoss, muscleGoal: true,
  }).rate * PLAN_MONTHS : 0;
  // Recomposition conserves total mass and keeps the sex-aware fat backstop intact.
  if (fatNow != null && (ctx.hasWeightLoss || ctx.hasBodyRecomp)) {
    const floorFraction = bodyFatFloorFraction(profile.sex, 'plan');
    muscleGain = Math.min(muscleGain, Math.max(0, fatNow - current * floorFraction));
    const lossWithMuscle = Math.max(0, (fatNow - current * floorFraction - muscleGain) / (1 - floorFraction));
    const originalLoss = loss;
    loss = Math.min(loss, lossWithMuscle);
    if (loss < originalLoss && calories != null && tdee != null) {
      calories = Math.ceil((tdee - loss / PLAN_WEEKS * KCAL_PER_KG_FAT / 7) / 25) * 25;
      loss = Math.min(loss, Math.max(0, tdee - calories) * 7 / KCAL_PER_KG_FAT * PLAN_WEEKS);
    }
  }
  const weight = ctx.hasWeightLoss ? current - loss
    : ctx.hasBuildMuscle && !ctx.hasBodyRecomp ? current + muscleGain : current;
  const leanEnd = leanNow == null ? null : leanNow + muscleGain;
  const fatEnd = leanEnd == null ? null : weight - leanEnd;
  const bodyComposition: BodyCompositionPlan = {
    weightKg: weight, fatKg: fatEnd, bodyFatPct: fatEnd == null ? null : fatEnd / weight * 100,
    muscleKg: muscle == null ? null : muscle + muscleGain,
    otherLeanKg: leanNow == null || muscle == null ? null : leanNow - muscle,
  };
  const deltaKg = round1(weight - current);
  const monthly = round1((weight - current) / PLAN_CALENDAR_MONTHS);
  const direction: TargetDirection = deltaKg < 0 ? 'lose' : deltaKg > 0 ? 'gain' : 'maintain';
  if (calories != null && height != null && tdee != null) {
    // Retain the existing high-BMI guard and name it, rather than silently claiming total weight.
    const referenceKg = Math.min(current, MACRO_REFERENCE_MAX_BMI * (height / 100) ** 2);
    const adjusted = referenceKg < current - 0.01;
    proteinG = roundTo(referenceKg * (direction === 'lose' ? CUT_PROTEIN : MAINTENANCE_PROTEIN), 5);
    fatG = roundTo(referenceKg * FAT_G_PER_KG, 5);
    const minimumCarbCalories = 50 * 4;
    if (proteinG * 4 + fatG * 9 + minimumCarbCalories > calories) {
      // Do not invent a larger calorie budget to fit an unsuitable automatic macro prescription.
      proteinG = null; fatG = null; carbsG = null;
      macroNote = CLIENT_REPORT_COPY.planMacroReview;
    } else {
      carbsG = Math.round((calories - proteinG * 4 - fatG * 9) / 4);
      macroNote = adjusted ? CLIENT_REPORT_COPY.planAdjustedProtein(referenceKg, direction === 'lose' ? CUT_PROTEIN : MAINTENANCE_PROTEIN) : null;
    }
  }
  return { currentWeightKg: round1(current), targetWeightKg: round1(weight), weightDeltaKg: deltaKg,
    monthlyWeightChangeKg: monthly, direction, calories, proteinG, carbsG, fatG,
    fuelSessionsNote: CLIENT_REPORT_COPY.planFuelNote, macroNote, bodyComposition };
}
