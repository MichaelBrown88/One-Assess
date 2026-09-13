/**
 * One weight-loss engine for the AXIS report: hero, path-forward, gap table,
 * and 90-day target all call this so the numbers cannot disagree.
 *
 * Destinations are floored at a healthy adult size (height × BMI, and a
 * healthy body-fat % on preserved lean mass). We never project a crash
 * to the lowest kg that a % of current weight would allow.
 */

export const WEIGHT_LOSS_WEEKS = {
  twelveWeeks: 12,
  ninetyDay: 13,
  fourMonths: 16,
  oneYear: 52,
} as const;

/** WHO-healthy is 18.5+; these are "still looks like an adult", not the underweight edge. */
const HEALTHY_BMI_FLOOR = {
  male: 21,
  female: 20,
  unknown: 20.5,
} as const;

/** Adequate (not athletic-shredded) body-fat floor on current lean mass. */
const HEALTHY_BF_FLOOR = {
  male: 0.2,
  female: 0.28,
  unknown: 0.24,
} as const;

const CUT_ANNUAL_BODYWEIGHT_FRACTION = 0.16;
const CUT_FAT_MASS_FRACTION = 0.55;

const RECOMP_RATE_FACTOR = 0.55;
const RECOMP_ANNUAL_BODYWEIGHT_FRACTION = 0.12;
const RECOMP_FAT_MASS_FRACTION = 0.35;

export type ProjectionSex = 'male' | 'female' | 'unknown';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function effectiveWeeklyLossKg(baseWeeklyRateKg: number, protectMuscle: boolean): number {
  const raw = Math.max(0, baseWeeklyRateKg);
  return protectMuscle ? round2(raw * RECOMP_RATE_FACTOR) : round2(raw);
}

/**
 * Lowest weight we will print as a goal. Uses the stricter (higher) of:
 * height × healthy BMI, and current lean mass at a healthy body-fat %.
 */
export function healthyMinimumWeightKg(options: {
  currentWeightKg: number;
  heightCm?: number;
  sex?: ProjectionSex;
  bodyFatPct?: number;
}): number {
  const { currentWeightKg, heightCm, bodyFatPct } = options;
  const sex: ProjectionSex = options.sex ?? 'unknown';
  const floors: number[] = [];

  if (heightCm != null && heightCm >= 120 && heightCm <= 230) {
    const metres = heightCm / 100;
    floors.push(HEALTHY_BMI_FLOOR[sex] * metres * metres);
  }

  if (bodyFatPct != null && bodyFatPct > 5 && bodyFatPct < 70) {
    const leanKg = currentWeightKg * (1 - bodyFatPct / 100);
    floors.push(leanKg / (1 - HEALTHY_BF_FLOOR[sex]));
  }

  if (floors.length === 0) return 0;
  const floor = Math.max(...floors);
  if (!Number.isFinite(floor) || floor <= 0) return 0;
  return Math.min(floor, currentWeightKg);
}

export function projectWeightLossKg(options: {
  currentWeightKg: number;
  weeklyRateKg: number;
  weeks: number;
  bodyFatPct?: number;
  heightCm?: number;
  sex?: ProjectionSex;
  /** True when build-muscle (or recomposition) is also a stated goal. */
  protectMuscle?: boolean;
}): { lossKg: number; endWeightKg: number; weeklyRateKg: number } {
  const { currentWeightKg, weeks, bodyFatPct, heightCm, sex, protectMuscle = false } = options;
  const weeklyRateKg = effectiveWeeklyLossKg(options.weeklyRateKg, protectMuscle);
  const uncapped = weeklyRateKg * Math.max(0, weeks);
  const fatMass =
    bodyFatPct != null && bodyFatPct > 0 ? (currentWeightKg * bodyFatPct) / 100 : null;
  const fatFraction = protectMuscle ? RECOMP_FAT_MASS_FRACTION : CUT_FAT_MASS_FRACTION;
  const annualFraction = protectMuscle
    ? RECOMP_ANNUAL_BODYWEIGHT_FRACTION
    : CUT_ANNUAL_BODYWEIGHT_FRACTION;
  const fatCap = fatMass != null ? fatMass * fatFraction : Number.POSITIVE_INFINITY;
  const annualCap = currentWeightKg * annualFraction;
  const healthyFloor = healthyMinimumWeightKg({
    currentWeightKg,
    heightCm,
    sex,
    bodyFatPct,
  });
  const healthyCap = healthyFloor > 0 ? Math.max(0, currentWeightKg - healthyFloor) : Number.POSITIVE_INFINITY;
  const timeCap = weeks >= WEIGHT_LOSS_WEEKS.oneYear ? Math.min(annualCap, fatCap) : fatCap;
  const cap = Math.min(timeCap, healthyCap);
  const lossKg = Math.max(0, Math.min(uncapped, cap));
  return { lossKg, endWeightKg: currentWeightKg - lossKg, weeklyRateKg };
}

export function formatKg1(n: number): string {
  return (Math.round(n * 10) / 10).toFixed(1);
}
