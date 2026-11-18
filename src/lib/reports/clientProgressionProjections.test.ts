import { describe, expect, it } from 'vitest';
import {
  buildBodyCompProgressionRows,
  buildCardioProgressionRows,
  buildStrengthProgressionRows,
  buildTapeMeasurementRows,
} from './clientProgressionProjections';
import { projectClientTwelveWeekWeightLoss } from './clientTwelveWeekWeight';
import type { FormData } from '@/contexts/FormContext';
import type { GapAnalysisData } from '@/components/reports/useGapAnalysisData';
import type { ScoreSummary } from '@/lib/scoring';

const sampleForm = {
  inbodyWeightKg: '81.2',
  inbodyBodyFatPct: '31.2',
  skeletalMuscleMassKg: '31.5',
  heightCm: '175',
  gender: 'male',
  dateOfBirth: '1995-01-15',
  clientGoals: ['weight-loss', 'build-muscle', 'improve-fitness'],
  activityLevel: 'sedentary',
} as FormData;

const gap: GapAnalysisData = {
  title: 'Body composition',
  icon: '',
  current: '',
  currentLabel: '',
  currentValue: '',
  target: '',
  targetLabel: '',
  targetValue: '',
  insight: '',
  status: 'green',
  bodyCompGaps: {
    weight: { current: 81.2, target: 72, gap: -9.2 },
    muscle: { current: 31.5, target: 34, gap: 2.5 },
    fat: { current: 31.2, target: 22, gap: -9.2 },
  },
};

describe('buildBodyCompProgressionRows', () => {
  it('prints a plan-length weight that matches the shared engine and keeps muscle up', () => {
    const rows = buildBodyCompProgressionRows(sampleForm, undefined, sampleForm.clientGoals, gap);
    const weight = rows.find((r) => r.name === 'Body weight');
    const muscle = rows.find((r) => r.name === 'Muscle mass');
    const projected = projectClientTwelveWeekWeightLoss(
      sampleForm,
      undefined,
      sampleForm.clientGoals,
      81.2,
    );
    expect(weight).toBeDefined();
    expect(projected).not.toBeNull();
    expect(Number(weight!.twelveWeeks)).toBeCloseTo(projected!.endWeightKg, 1);
    expect(Number(weight!.twelveWeeks)).toBeGreaterThan(71);
    expect(Number(weight!.twelveWeeks)).toBeLessThan(Number(weight!.current));
    expect(Number(muscle!.twelveWeeks)).toBeGreaterThan(Number(muscle!.current));
    const fat = rows.find((r) => r.name === 'Body fat');
    expect(Number(fat!.current) - Number(fat!.twelveWeeks)).toBeGreaterThan(3);
  });

  it('keeps tape off the 12-week body-comp table', () => {
    const withTape = {
      ...sampleForm,
      waistCm: '92.4',
      hipsCm: '104',
      shouldersCm: '118',
    } as FormData;
    const rows = buildBodyCompProgressionRows(withTape, undefined, withTape.clientGoals, gap);
    expect(rows.find((r) => r.name === 'Waist')).toBeUndefined();
    const tape = buildTapeMeasurementRows(withTape);
    expect(tape.find((r) => r.name === 'Waist')).toEqual({
      name: 'Waist',
      unit: 'cm',
      current: '92.4',
      twelveWeeks: '–',
    });
    expect(tape.find((r) => r.name === 'Hips')?.current).toBe('104.0');
    expect(tape.find((r) => r.name === 'Shoulders')?.current).toBe('118.0');
  });

  it('reads tape when analyzer gaps are missing, without filling the outlook table', () => {
    const tapeOnly = { waistCm: '88', armLeftCm: '32' } as FormData;
    expect(buildBodyCompProgressionRows(tapeOnly, undefined, [], undefined)).toEqual([]);
    const tape = buildTapeMeasurementRows(tapeOnly);
    expect(tape.find((r) => r.name === 'Waist')?.current).toBe('88.0');
    expect(tape.find((r) => r.name === 'Left arm')?.current).toBe('32.0');
  });

  it('projects 12-week muscle from the training block, not a 12/52 slice of a year target', () => {
    const muscleOnly = {
      ...sampleForm,
      clientGoals: ['build-muscle'],
      activityLevel: 'sedentary',
    } as FormData;
    const rows = buildBodyCompProgressionRows(muscleOnly, undefined, muscleOnly.clientGoals, gap);
    const muscle = rows.find((r) => r.name === 'Muscle mass');
    const yearSlice = 31.5 + (34 - 31.5) * (12 / 52);
    expect(Number(muscle!.twelveWeeks)).toBeGreaterThan(yearSlice);
    expect(Number(muscle!.twelveWeeks) - Number(muscle!.current)).toBeGreaterThan(1.5);
  });
});

describe('buildStrengthProgressionRows', () => {
  const strengthGap: GapAnalysisData = {
    title: 'Strength',
    icon: '',
    current: '',
    currentLabel: '',
    currentValue: '',
    target: '',
    targetLabel: '',
    targetValue: '',
    insight: '',
    status: 'green',
    functionalGaps: {
      endurance: { current: 65, target: 80, gap: 15 },
      core: { current: 50, target: 70, gap: 20 },
    },
  };

  it('projects upper, lower, grip, and core from captured tests', () => {
    const form = {
      ...sampleForm,
      pushupsOneMinuteReps: '28',
      squatsOneMinuteReps: '37',
      plankDurationSeconds: '50',
      gripLeftKg: '40',
      gripRightKg: '42',
    } as FormData;
    const rows = buildStrengthProgressionRows(form, form.clientGoals, strengthGap);
    const upper = rows.find((r) => r.name === 'Upper-body strength and endurance');
    const lower = rows.find((r) => r.name === 'Lower-body strength and endurance');
    const grip = rows.find((r) => r.name === 'Grip strength');
    const plank = rows.find((r) => r.name === 'Core strength');
    expect(upper?.current).toBe('28');
    expect(lower?.current).toBe('37');
    expect(grip?.current).toBe('42.0');
    expect(plank?.current).toBe('50');
    expect(Number(upper!.twelveWeeks) - Number(upper!.current)).toBeGreaterThan(0);
    expect(Number(plank!.twelveWeeks) - Number(plank!.current)).toBeGreaterThan(0);
    expect(Number(grip!.twelveWeeks)).toBeGreaterThan(Number(grip!.current));
  });
});

describe('buildCardioProgressionRows', () => {
  it('includes captured peak HR without inventing a 12-week value', () => {
    const form = {
      cardioRestingHr: '68',
      cardioPeakHr: '152',
      cardioPost1MinHr: '118',
    } as FormData;
    const cardioGap: GapAnalysisData = {
      title: 'Fitness',
      icon: '',
      current: '',
      currentLabel: '',
      currentValue: '',
      target: '',
      targetLabel: '',
      targetValue: '',
      insight: '',
      status: 'green',
      cardioGaps: {
        vo2: { current: 0, target: 0, gap: 0 },
        rhr: { current: 68, target: 60, gap: -8 },
        recovery: { current: 34, target: 40, gap: 6 },
      },
    };
    const rows = buildCardioProgressionRows(form, undefined, [], cardioGap);
    const peak = rows.find((r) => r.name === 'Peak heart rate');
    expect(peak).toEqual({ name: 'Peak heart rate', unit: 'bpm', current: '152', twelveWeeks: '–' });
  });

  it('projects a 12-week cardio block for two easy sessions, not a 1-bpm year slice', () => {
    const scores: ScoreSummary = {
      overall: 73,
      fullProfileScore: 73,
      synthesis: [],
      categories: [
        {
          id: 'cardio',
          title: 'Metabolic Fitness',
          score: 73,
          assessed: true,
          details: [],
          strengths: [],
          weaknesses: [],
        },
      ],
    };
    const cardioGap: GapAnalysisData = {
      title: 'Fitness',
      icon: '',
      current: '',
      currentLabel: '',
      currentValue: '',
      target: '',
      targetLabel: '',
      targetValue: '',
      insight: '',
      status: 'green',
      cardioGaps: {
        vo2: { current: 73, target: 85, gap: 12 },
        rhr: { current: 75, target: 60, gap: -15 },
        recovery: { current: 31, target: 40, gap: 9 },
      },
    };
    const form = {
      ...sampleForm,
      cardioRestingHr: '75',
      cardioPeakHr: '152',
      cardioPost1MinHr: '121',
    } as FormData;
    const rows = buildCardioProgressionRows(form, scores, form.clientGoals, cardioGap);
    const fitness = rows.find((r) => r.name === 'Fitness level');
    const rhr = rows.find((r) => r.name === 'Resting heart rate');
    const hrr = rows.find((r) => r.name === 'Heart recovery');
    expect(Number(fitness!.twelveWeeks) - Number(fitness!.current)).toBeGreaterThanOrEqual(8);
    expect(Number(rhr!.current) - Number(rhr!.twelveWeeks)).toBeGreaterThanOrEqual(6);
    expect(Number(hrr!.twelveWeeks) - Number(hrr!.current)).toBeGreaterThanOrEqual(6);
  });
});
