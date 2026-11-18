import { describe, expect, it } from 'vitest';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';
import type { GapAnalysisData } from '@/components/reports/useGapAnalysisData';
import { buildClientReportModel } from './buildClientReportModel';
import { formatProgressionChange } from './formatProgressionChange';
import { bodyFatFloorFraction, healthyMinimumWeightKg } from './weightLossProjection';
import { reportPlanSessions, withReportLiftingSessions } from './plannedTraining';
import {
  OPTIMAL_FITNESS_SCORE,
  OPTIMAL_HEART_RECOVERY,
  OPTIMAL_RESTING_HR,
} from './clientProgressionProjections';

/** Deterministic PRNG so a failure always reproduces. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Sex = 'male' | 'female' | '';

interface Client {
  sex: Sex;
  age: number | null;
  heightCm: number | null;
  weightKg: number;
  bodyFatPct: number;
  muscleKg: number;
  goals: string[];
  trainingFrequency: string;
  trainingExperience: string;
  sleepScore: number;
  stressScore: number;
  fitnessScore: number;
  restingHr: number;
  recoveryBpm: number;
  enduranceReps: number;
  coreSec: number;
  goalLevelWeightLoss: string;
}

const GOAL_SETS: string[][] = [
  ['weight-loss'],
  ['build-muscle'],
  ['weight-loss', 'build-muscle'],
  ['build-muscle', 'weight-loss'],
  ['body-recomposition'],
  ['improve-fitness'],
  ['improve-fitness', 'weight-loss'],
  ['build-strength'],
  ['general-health'],
  [],
];

function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)];
}

function between(rand: () => number, lo: number, hi: number): number {
  return lo + rand() * (hi - lo);
}

function randomClient(rand: () => number): Client {
  const sex = pick<Sex>(rand, ['male', 'female', '']);
  const heightCm = rand() < 0.08 ? null : Math.round(between(rand, 145, 205));
  const bmi = between(rand, 17, 48);
  const h = (heightCm ?? 172) / 100;
  const weightKg = Math.round(bmi * h * h * 10) / 10;
  const femaleShift = sex === 'female' ? 8 : 0;
  const bodyFatPct = Math.round(between(rand, 6 + femaleShift, 50 + femaleShift / 2) * 10) / 10;
  const leanKg = weightKg * (1 - bodyFatPct / 100);
  const muscleKg = Math.round(leanKg * between(rand, 0.5, 0.6) * 10) / 10;
  return {
    sex,
    age: rand() < 0.08 ? null : Math.round(between(rand, 18, 80)),
    heightCm,
    weightKg,
    bodyFatPct,
    muscleKg,
    goals: pick(rand, GOAL_SETS),
    trainingFrequency: pick(rand, ['', '0', '1', '2', '3', '4', '5+', '6']),
    trainingExperience: pick(rand, ['', 'beginner', 'intermediate', 'advanced']),
    sleepScore: Math.round(between(rand, 20, 100)),
    stressScore: Math.round(between(rand, 20, 100)),
    fitnessScore: Math.round(between(rand, 5, 100)),
    restingHr: Math.round(between(rand, 40, 100)),
    recoveryBpm: Math.round(between(rand, 5, 65)),
    enduranceReps: Math.round(pick(rand, [between(rand, 1, 10), between(rand, 10, 60), between(rand, 60, 160)])),
    coreSec: Math.round(pick(rand, [between(rand, 3, 20), between(rand, 20, 120), between(rand, 120, 400)])),
    goalLevelWeightLoss: pick(rand, ['', '5', '10', '15', '5kg', '10kg']),
  };
}

const TODAY = new Date('2026-09-28T12:00:00Z');

function dobForAge(age: number | null): string {
  if (age == null) return '';
  return `${TODAY.getUTCFullYear() - age}-03-15`;
}

function toFormData(c: Client): FormData {
  // Only the fields the report projections read.
  return {
    gender: c.sex,
    dateOfBirth: dobForAge(c.age),
    heightCm: c.heightCm == null ? '' : String(c.heightCm),
    inbodyWeightKg: String(c.weightKg),
    inbodyBodyFatPct: String(c.bodyFatPct),
    skeletalMuscleMassKg: String(c.muscleKg),
    clientGoals: c.goals,
    trainingFrequency: c.trainingFrequency,
    trainingExperience: c.trainingExperience,
    goalLevelWeightLoss: c.goalLevelWeightLoss,
    cardioRestingHr: String(c.restingHr),
    cardioPeakHr: '150',
    cardioPost1MinHr: String(150 - c.recoveryBpm),
    pushupsOneMinuteReps: String(c.enduranceReps),
    plankDurationSeconds: String(c.coreSec),
    assessedAt: TODAY.toISOString(),
  } as unknown as FormData;
}

function toScores(c: Client): ScoreSummary {
  const cat = (id: string, score: number, details: ScoreSummary['categories'][number]['details'] = []) => ({
    id,
    title: id,
    score,
    assessed: true,
    details,
    strengths: [],
    weaknesses: [],
  });
  return {
    overall: 60,
    fullProfileScore: 60,
    synthesis: [],
    categories: [
      cat('bodyComp', 60),
      cat('strength', 60),
      cat('cardio', c.fitnessScore),
      cat('movementQuality', 60),
      cat('lifestyle', 60, [
        { id: 'sleep', label: 'Sleep', value: '', score: c.sleepScore },
        { id: 'stress', label: 'Stress', value: '', score: c.stressScore },
      ]),
    ],
  } as unknown as ScoreSummary;
}

const EMPTY_GAP = {
  title: '',
  icon: '',
  current: '',
  currentLabel: '',
  currentValue: '',
  target: '',
  targetLabel: '',
  targetValue: '',
  insight: '',
  status: 'green' as const,
};

function toGaps(c: Client): GapAnalysisData[] {
  return [
    {
      ...EMPTY_GAP,
      bodyCompGaps: {
        weight: { current: c.weightKg, target: c.weightKg, gap: 0 },
        muscle: { current: c.muscleKg, target: c.muscleKg, gap: 0 },
        fat: { current: c.bodyFatPct, target: c.bodyFatPct, gap: 0 },
      },
    },
    {
      ...EMPTY_GAP,
      functionalGaps: {
        endurance: { current: c.enduranceReps, target: c.enduranceReps, gap: 0 },
        core: { current: c.coreSec, target: c.coreSec, gap: 0 },
      },
    },
    {
      ...EMPTY_GAP,
      cardioGaps: {
        vo2: { current: 0, target: 0, gap: 0 },
        rhr: { current: c.restingHr, target: c.restingHr, gap: 0 },
        recovery: { current: c.recoveryBpm, target: c.recoveryBpm, gap: 0 },
      },
    },
  ];
}

interface Violation { rule: string; detail: string; client: Client }
const OPTIMAL: Record<string, number> = {
  'Fitness level': OPTIMAL_FITNESS_SCORE, 'Resting heart rate': OPTIMAL_RESTING_HR, 'Heart recovery': OPTIMAL_HEART_RECOVERY,
};
function checkClient(c: Client): Violation[] {
  const out: Violation[] = [];
  const flag = (rule: string, detail: string) => out.push({ rule, detail, client: c });
  const formData = toFormData(c);
  const model = buildClientReportModel({ scores: toScores(c), formData, goals: c.goals,
    gapAnalysisData: toGaps(c), clientName: 'Test Client', reportDate: 'Sep 28, 2026' });
  const rows = model.pillars.flatMap(p => p.progressionRows);
  const target = model.roadmapTarget;
  for (const row of rows) {
    const now = Number(row.current), end = Number(row.twelveWeeks);
    const printed = formatProgressionChange(row, 'plan');
    if (/NaN|Infinity|undefined/.test(JSON.stringify(printed))) flag('readable change', row.name);
    if (!Number.isFinite(end)) continue;
    const optimal = OPTIMAL[row.name];
    if (optimal != null) {
      const lower = row.name === 'Resting heart rate';
      if (lower ? end < Math.min(now, optimal) : end > Math.max(now, optimal)) flag('optimal limit', row.name);
    }
    if (row.name === 'Body weight') {
      const floor = healthyMinimumWeightKg({ currentWeightKg: c.weightKg, heightCm: c.heightCm ?? undefined,
        sex: c.sex || 'unknown', bodyFatPct: c.bodyFatPct, bodyFatFloor: 'plan' });
      if (end < floor - 0.1) flag('healthy floor', `${now} -> ${end}`);
      if (now - end > c.weightKg * 0.01 * 16 + 0.1) flag('weekly loss limit', `${now} -> ${end}`);
      if (!c.goals.includes('weight-loss') && end < now) flag('no unsolicited cut', `${now} -> ${end}`);
      if (end !== target?.targetWeightKg) flag('shared weight', `${end} vs ${target?.targetWeightKg}`);
      const pace = (row.changeAtPlan ?? 0) / (16 * 12 / 52);
      if (Math.abs(pace - (target?.monthlyWeightChangeKg ?? 0)) > 0.051) flag('shared pace', `${pace}`);
    }
    if (row.name === 'Muscle mass' && end < now) flag('protect muscle', `${now} -> ${end}`);
  }
  if (target?.bodyComposition) {
    const body = target.bodyComposition;
    if (body.fatKg != null && body.muscleKg != null && body.otherLeanKg != null) {
      if (Math.abs(body.fatKg + body.muscleKg + body.otherLeanKg - body.weightKg) > 1e-7) flag('mass balance', JSON.stringify(body));
      const originalOtherLean = c.weightKg * (1 - c.bodyFatPct / 100) - c.muscleKg;
      if (Math.abs(originalOtherLean - body.otherLeanKg) > 1e-7) flag('stable other lean mass', `${body.otherLeanKg}`);
    }
    if ((c.goals.includes('weight-loss') || c.goals.includes('body-recomposition')) && body.bodyFatPct != null && body.bodyFatPct < Math.min(c.bodyFatPct, bodyFatFloorFraction(c.sex || 'unknown', 'plan') * 100) - 0.01)
      flag('body-fat backstop', `${body.bodyFatPct}`);
  }
  if (target?.calories != null && target.proteinG != null && target.fatG != null && target.carbsG != null) {
    const energy = target.proteinG * 4 + target.fatG * 9 + target.carbsG * 4;
    if (Math.abs(energy - target.calories) > 10) flag('macro energy', `${energy} vs ${target.calories}`);
    const reference = Math.min(c.weightKg, 30 * ((c.heightCm ?? 0) / 100) ** 2);
    if (target.proteinG > reference * 2.2 + 2.5) flag('protein upper bound', `${target.proteinG}`);
    if (reference < c.weightKg - 0.01 && !target.macroNote) flag('adjusted-weight disclosure', `${reference}`);
  }
  if (model.roadmapCards.length !== new Set(c.goals).size) flag('only stated goals', `${model.roadmapCards.length}`);
  return out;
}

function summarise(violations: Violation[]): string {
  const byRule = new Map<string, Violation[]>();
  for (const v of violations) byRule.set(v.rule, [...(byRule.get(v.rule) ?? []), v]);
  return [...byRule.entries()]
    .map(([rule, list]) => {
      const examples = list
        .slice(0, 3)
        .map(
          (v) =>
            `    ${v.detail} | ${v.client.sex || 'unknown'} ${v.client.age ?? '?'}y ${v.client.heightCm ?? '?'}cm ${v.client.weightKg}kg ${v.client.bodyFatPct}% goals=[${v.client.goals.join(',')}] freq=${v.client.trainingFrequency || '-'} exp=${v.client.trainingExperience || '-'}`,
        )
        .join('\n');
      return `${rule}: ${list.length}\n${examples}`;
    })
    .join('\n');
}

const SWEEP_SIZE = Number(process.env.AXIS_SWEEP_SIZE ?? 4000);

const MESSY_FIELDS: Array<Record<string, unknown>> = [
  {},
  { inbodyWeightKg: '', inbodyBodyFatPct: '', skeletalMuscleMassKg: '', heightCm: '' },
  { inbodyWeightKg: '82', inbodyBodyFatPct: '', heightCm: '' },
  { inbodyWeightKg: 'abc', heightCm: 'tall', dateOfBirth: 'not a date', gender: 'Other' },
  { inbodyWeightKg: '0', inbodyBodyFatPct: '0', heightCm: '0' },
  { inbodyWeightKg: '210', inbodyBodyFatPct: '62', heightCm: '165', dateOfBirth: '1936-01-01' },
  { inbodyWeightKg: '38', inbodyBodyFatPct: '9', heightCm: '140', gender: 'female', dateOfBirth: '2010-05-01' },
  { trainingFrequency: 'lots', trainingExperience: 'pro', clientGoals: ['weight-loss', 'unknown-goal'] },
  { clientGoals: 'weight-loss' },
];

describe('AXIS report projections across client populations', () => {
  it('keeps mass, energy, goals and safety bounds consistent across thousands of clients', () => {
    const rand = mulberry32(20260928);
    const violations: Violation[] = [];
    for (let i = 0; i < SWEEP_SIZE; i++) violations.push(...checkClient(randomClient(rand)));
    expect(violations.length, summarise(violations)).toBe(0);
  });

  it('never prints NaN, Infinity or undefined for blank, garbage or extreme inputs', () => {
    const base = randomClient(mulberry32(7));
    for (const fields of MESSY_FIELDS) {
      for (const goals of GOAL_SETS) {
        // Deliberately malformed form payloads — the report must degrade, not break.
        const formData = { ...toFormData({ ...base, goals }), ...fields } as unknown as FormData;
        const planned = withReportLiftingSessions(formData, reportPlanSessions(formData));
        const weight = Number(formData.inbodyWeightKg) || 0;
        const gaps = toGaps({ ...base, weightKg: weight, bodyFatPct: Number(formData.inbodyBodyFatPct) || 0 });
        const model = buildClientReportModel({
          scores: toScores(base),
          formData: planned,
          goals: Array.isArray(formData.clientGoals) ? formData.clientGoals : undefined,
          gapAnalysisData: gaps,
          clientName: 'Test Client',
          reportDate: 'Sep 28, 2026',
        });
        const tables = model.pillars.map(p => p.progressionRows);
        const text = JSON.stringify({ promise: model.goalPromise, target: model.roadmapTarget, tables });
        expect(text, JSON.stringify(fields)).not.toMatch(/NaN|Infinity|undefined/);
      }
    }
  });
});
