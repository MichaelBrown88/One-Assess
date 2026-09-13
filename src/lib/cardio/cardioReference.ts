/**
 * Age/sex reference bands for the studio cardio screen:
 * seated resting HR, peak HR on the standard 3-min walk (speed 5 / incline 10),
 * and 1-minute heart-rate recovery drop.
 *
 * Resting HR: collapsed YMCA-style categories (lower is better).
 * Recovery drop: ACSM 1-minute HRR (bigger drop is better; <12 bpm is a clinical flag).
 * Walk peak: share of age-predicted max (Gellish 208 − 0.7×age). Same workload for
 * every client — a lower % means the walk was easier, i.e. fitter. Not VO₂ max.
 */

import { CARDIO_REFERENCE_COPY } from '@/constants/cardioReference';

export type CardioRefBand = 'excellent' | 'good' | 'average' | 'poor';
export type CardioRefMetricId = 'rhr' | 'peak' | 'hrr';
export type CardioRefSex = 'male' | 'female';

export interface CardioReferenceInputs {
  age: number;
  gender: CardioRefSex;
  restingHr: number;
  peakHr: number;
  recoveryHr: number;
}

export interface CardioRefBandRange {
  band: CardioRefBand;
  rangeLabel: string;
}

export interface CardioRefMetricChart {
  id: CardioRefMetricId;
  label: string;
  hint: string;
  unit: string;
  value: number | null;
  valueLabel: string;
  band: CardioRefBand | null;
  ranges: CardioRefBandRange[];
}

export interface CardioReferenceChart {
  bracketLabel: string;
  metrics: CardioRefMetricChart[];
}

export const CARDIO_AGE_BRACKETS = ['18-25', '26-35', '36-45', '46-55', '56-65', '66+'] as const;
export type CardioAgeBracket = (typeof CARDIO_AGE_BRACKETS)[number];

/** Inclusive upper bound for lower-is-better resting HR (bpm). */
interface RhrBounds {
  excellentMax: number;
  goodMax: number;
  averageMax: number;
}

const RHR_BOUNDS: Record<CardioRefSex, Record<CardioAgeBracket, RhrBounds>> = {
  male: {
    '18-25': { excellentMax: 61, goodMax: 69, averageMax: 73 },
    '26-35': { excellentMax: 61, goodMax: 70, averageMax: 74 },
    '36-45': { excellentMax: 62, goodMax: 71, averageMax: 76 },
    '46-55': { excellentMax: 63, goodMax: 72, averageMax: 77 },
    '56-65': { excellentMax: 62, goodMax: 71, averageMax: 76 },
    '66+': { excellentMax: 62, goodMax: 71, averageMax: 76 },
  },
  female: {
    '18-25': { excellentMax: 65, goodMax: 73, averageMax: 78 },
    '26-35': { excellentMax: 65, goodMax: 73, averageMax: 78 },
    '36-45': { excellentMax: 66, goodMax: 74, averageMax: 79 },
    '46-55': { excellentMax: 67, goodMax: 75, averageMax: 80 },
    '56-65': { excellentMax: 66, goodMax: 74, averageMax: 79 },
    '66+': { excellentMax: 66, goodMax: 74, averageMax: 79 },
  },
};

export function ageBracketFor(age: number): CardioAgeBracket {
  if (age <= 25) return '18-25';
  if (age <= 35) return '26-35';
  if (age <= 45) return '36-45';
  if (age <= 55) return '46-55';
  if (age <= 65) return '56-65';
  return '66+';
}

export function estimatedMaxHr(age: number): number {
  return 208 - 0.7 * age;
}

function bandFromUpperBounds(value: number, bounds: RhrBounds): CardioRefBand {
  if (value <= bounds.excellentMax) return 'excellent';
  if (value <= bounds.goodMax) return 'good';
  if (value <= bounds.averageMax) return 'average';
  return 'poor';
}

export function classifyRestingHrBand(
  rhr: number,
  gender: CardioRefSex,
  age: number,
): CardioRefBand | null {
  if (rhr <= 0) return null;
  return bandFromUpperBounds(rhr, RHR_BOUNDS[gender][ageBracketFor(age)]);
}

export function classifyHrrDropBand(dropBpm: number): CardioRefBand | null {
  if (dropBpm <= 0) return null;
  if (dropBpm >= 30) return 'excellent';
  if (dropBpm >= 20) return 'good';
  if (dropBpm >= 12) return 'average';
  return 'poor';
}

/** Share of estimated max HR on the standard walk. Lower = fitter. */
export function classifyPeakWalkBand(peakHr: number, age: number): CardioRefBand | null {
  if (peakHr <= 0 || age <= 0) return null;
  const pct = (peakHr / estimatedMaxHr(age)) * 100;
  if (pct < 62) return 'excellent';
  if (pct < 72) return 'good';
  if (pct < 80) return 'average';
  return 'poor';
}

function rhrRangeLabels(gender: CardioRefSex, age: number): CardioRefBandRange[] {
  const b = RHR_BOUNDS[gender][ageBracketFor(age)];
  return [
    { band: 'excellent', rangeLabel: `≤ ${b.excellentMax}` },
    { band: 'good', rangeLabel: `${b.excellentMax + 1}–${b.goodMax}` },
    { band: 'average', rangeLabel: `${b.goodMax + 1}–${b.averageMax}` },
    { band: 'poor', rangeLabel: `${b.averageMax + 1}+` },
  ];
}

const HRR_RANGES: CardioRefBandRange[] = [
  { band: 'excellent', rangeLabel: '30+ drop' },
  { band: 'good', rangeLabel: '20–29 drop' },
  { band: 'average', rangeLabel: '12–19 drop' },
  { band: 'poor', rangeLabel: 'Under 12 drop' },
];

const PEAK_RANGES: CardioRefBandRange[] = [
  { band: 'excellent', rangeLabel: 'Under 62% of max' },
  { band: 'good', rangeLabel: '62–71% of max' },
  { band: 'average', rangeLabel: '72–79% of max' },
  { band: 'poor', rangeLabel: '80%+ of max' },
];

function formatBpm(n: number): string {
  return String(Math.round(n));
}

export function buildCardioReference(input: CardioReferenceInputs): CardioReferenceChart {
  const bracket = ageBracketFor(input.age);
  const sexLabel = input.gender === 'female' ? 'Women' : 'Men';
  const drop =
    input.peakHr > 0 && input.recoveryHr > 0 ? input.peakHr - input.recoveryHr : 0;
  const maxHr = estimatedMaxHr(input.age);
  const peakPct = input.peakHr > 0 && maxHr > 0 ? Math.round((input.peakHr / maxHr) * 100) : null;

  const rhrBand = classifyRestingHrBand(input.restingHr, input.gender, input.age);
  const peakBand = classifyPeakWalkBand(input.peakHr, input.age);
  const hrrBand = classifyHrrDropBand(drop);

  const metrics: CardioRefMetricChart[] = [
    {
      id: 'rhr',
      label: CARDIO_REFERENCE_COPY.metrics.rhr.label,
      hint: CARDIO_REFERENCE_COPY.metrics.rhr.hint,
      unit: CARDIO_REFERENCE_COPY.metrics.rhr.unit,
      value: input.restingHr > 0 ? input.restingHr : null,
      valueLabel: input.restingHr > 0 ? formatBpm(input.restingHr) : CARDIO_REFERENCE_COPY.missing,
      band: rhrBand,
      ranges: rhrRangeLabels(input.gender, input.age),
    },
    {
      id: 'peak',
      label: CARDIO_REFERENCE_COPY.metrics.peak.label,
      hint: CARDIO_REFERENCE_COPY.metrics.peak.hint,
      unit: CARDIO_REFERENCE_COPY.metrics.peak.unit,
      value: input.peakHr > 0 ? input.peakHr : null,
      valueLabel:
        input.peakHr > 0
          ? peakPct != null
            ? `${formatBpm(input.peakHr)} · ${CARDIO_REFERENCE_COPY.percentOfMax(peakPct)}`
            : formatBpm(input.peakHr)
          : CARDIO_REFERENCE_COPY.missing,
      band: peakBand,
      ranges: PEAK_RANGES,
    },
    {
      id: 'hrr',
      label: CARDIO_REFERENCE_COPY.metrics.hrr.label,
      hint: CARDIO_REFERENCE_COPY.metrics.hrr.hint,
      unit: CARDIO_REFERENCE_COPY.metrics.hrr.unit,
      value: drop > 0 ? drop : null,
      valueLabel: drop > 0 ? formatBpm(drop) : CARDIO_REFERENCE_COPY.missing,
      band: hrrBand,
      ranges: HRR_RANGES,
    },
  ];

  return {
    bracketLabel: `${sexLabel} ${bracket.replace('-', '–')}`,
    metrics,
  };
}
