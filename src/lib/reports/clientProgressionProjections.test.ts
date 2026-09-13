import { describe, expect, it } from 'vitest';
import { buildBodyCompProgressionRows } from './clientProgressionProjections';
import { projectClientTwelveWeekWeightLoss } from './clientTwelveWeekWeight';
import type { FormData } from '@/contexts/FormContext';
import type { GapAnalysisData } from '@/components/reports/useGapAnalysisData';

const ibrahimForm = {
  inbodyWeightKg: '81.2',
  inbodyBodyFatPct: '31.2',
  skeletalMuscleMassKg: '31.5',
  heightCm: '175',
  gender: 'male',
  dateOfBirth: '1995-03-25',
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
  it('prints a 12-week weight that matches the shared engine and keeps muscle up', () => {
    const rows = buildBodyCompProgressionRows(ibrahimForm, undefined, ibrahimForm.clientGoals, gap);
    const weight = rows.find((r) => r.name === 'Body weight');
    const muscle = rows.find((r) => r.name === 'Muscle mass');
    const projected = projectClientTwelveWeekWeightLoss(
      ibrahimForm,
      undefined,
      ibrahimForm.clientGoals,
      81.2,
    );
    expect(weight).toBeDefined();
    expect(projected).not.toBeNull();
    expect(Number(weight!.twelveWeeks)).toBeCloseTo(projected!.endWeightKg, 1);
    expect(Number(weight!.twelveWeeks)).toBeGreaterThan(74);
    expect(Number(weight!.twelveWeeks)).toBeLessThan(Number(weight!.current));
    expect(Number(muscle!.twelveWeeks)).toBeGreaterThan(Number(muscle!.current));
  });
});
