import { describe, expect, it } from 'vitest';
import { buildClientReportModel } from './buildClientReportModel';
import { buildTapeMeasurementRows } from './clientProgressionProjections';
import { CLIENT_COPY_FORBIDDEN } from './sanitizeClientReportCopy';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';
import type { GapAnalysisData } from '@/components/reports/useGapAnalysisData';
import { CLIENT_PLAN_WEEKS } from '@/constants/clientReport';

const formData = {
  inbodyWeightKg: '81.2',
  inbodyBodyFatPct: '31.2',
  skeletalMuscleMassKg: '31.5',
  heightCm: '175',
  gender: 'male',
  dateOfBirth: '1995-01-15',
  clientGoals: ['weight-loss', 'build-muscle', 'improve-fitness'],
  cardioRestingHr: '75',
  cardioPeakHr: '152',
  cardioPost1MinHr: '121',
  // Test fixture — only the fields the 12-week model reads.
} as unknown as FormData;

const scores: ScoreSummary = {
  overall: 73,
  fullProfileScore: 73,
  synthesis: [],
  categories: [
    { id: 'bodyComp', title: 'Body Composition', score: 62, assessed: true, details: [], strengths: [], weaknesses: [] },
    { id: 'strength', title: 'Functional Strength', score: 80, assessed: true, details: [], strengths: [], weaknesses: [] },
    { id: 'cardio', title: 'Metabolic Fitness', score: 73, assessed: true, details: [], strengths: [], weaknesses: [] },
    { id: 'movementQuality', title: 'Movement Quality', score: 70, assessed: true, details: [], strengths: [], weaknesses: [] },
    { id: 'lifestyle', title: 'Lifestyle Factors', score: 68, assessed: true, details: [], strengths: [], weaknesses: [] },
  ],
};

const emptyGap = {
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

const gapAnalysisData: GapAnalysisData[] = [
  {
    ...emptyGap,
    bodyCompGaps: {
      weight: { current: 81.2, target: 72, gap: -9.2 },
      muscle: { current: 31.5, target: 34, gap: 2.5 },
      fat: { current: 31.2, target: 22, gap: -9.2 },
    },
  },
  {
    ...emptyGap,
    functionalGaps: {
      endurance: { current: 20, target: 30, gap: 10 },
      core: { current: 45, target: 60, gap: 15 },
    },
  },
  {
    ...emptyGap,
    cardioGaps: {
      vo2: { current: 38.4, target: 45, gap: 6.6 },
      rhr: { current: 75, target: 60, gap: -15 },
      recovery: { current: 31, target: 40, gap: 9 },
    },
  },
];

describe('buildClientReportModel', () => {
  it('adds a left/right grip balance block to strength only when the gap is material', () => {
    const build = (left: string, right: string) =>
      buildClientReportModel({
        scores,
        formData: { ...formData, gripLeftKg: left, gripRightKg: right } as FormData,
        goals: formData.clientGoals,
        gapAnalysisData,
        clientName: 'Sample Client',
        reportDate: 'Sep 13, 2026',
      });
    const strength = (left: string, right: string) => build(left, right).pillars.find((p) => p.scoringId === 'strength');
    expect(strength('36', '44')?.gripImbalance).toMatchObject({ weakSide: 'left', gapPct: 18 });
    expect(strength('43', '44')?.gripImbalance).toBeNull();
    expect(build('36', '44').pillars.filter((p) => p.gripImbalance).map((p) => p.scoringId)).toEqual(['strength']);
  });

  it('prints a plan-length promise and Fitness level as the 0–100 score, not VO2', () => {
    const model = buildClientReportModel({
      scores,
      formData,
      goals: formData.clientGoals,
      gapAnalysisData,
      clientName: 'Sample Client',
      reportDate: 'Sep 13, 2026',
    });

    expect(model.goalPromise).toMatch(new RegExp(`${CLIENT_PLAN_WEEKS} weeks`));
    expect(model.goalPromise).not.toMatch(CLIENT_COPY_FORBIDDEN);
    expect(model.goalPromise.toLowerCase()).not.toMatch(/four months|\bin a year\b|90-day/);
    expect(model.radarData).toHaveLength(5);

    const cardio = model.pillars.find((p) => p.scoringId === 'cardio');
    const fitnessChip = cardio?.metrics.find((m) => m.label === 'Fitness level');
    expect(fitnessChip?.value).toBe('73');
    expect(fitnessChip?.value).not.toBe('38.4');

    const weightRow = model.pillars
      .find((p) => p.scoringId === 'bodyComp')
      ?.progressionRows.find((r) => r.name === 'Body weight');
    expect(weightRow?.twelveWeeks).toBeDefined();
    expect(weightRow?.oneMonth).toBeDefined();
    expect(Number(weightRow!.twelveWeeks)).toBeCloseTo(model.roadmapTarget!.targetWeightKg!, 0);
    expect(Number(weightRow!.oneMonth)).toBeGreaterThan(Number(weightRow!.twelveWeeks));
    expect(Number(weightRow!.oneMonth)).toBeLessThan(Number(weightRow!.current));
    expect(model.planSmartGoals.some((g) => g.id === 'bc-weight')).toBe(true);

    expect(model.priorityFocus).toEqual({ label: 'Body composition', score: 62 });
    expect(model.welcome).toMatch(/for men aged 26–35/i);
    expect(model.welcome.split(/[.!?]+/).filter((s) => s.trim()).length).toBeLessThanOrEqual(3);
    expect(model.welcome.toLowerCase()).not.toMatch(/focus this block|improved|last time|last assessment/);
  });

  it('includes posture when photos exist without AI analysis', () => {
    const model = buildClientReportModel({
      scores,
      formData: {
        ...formData,
        postureImagesStorage: {
          front: 'https://example.com/posture/front.jpg',
        },
      } as FormData,
      goals: formData.clientGoals,
      gapAnalysisData,
      clientName: 'Sample Client',
      reportDate: 'Sep 13, 2026',
    });

    expect(model.posture).not.toBeNull();
    expect(model.posture?.images.front).toContain('https://');
    expect(model.posture?.findings).toEqual([]);
  });

  it('includes posture from legacy storage keys and from analysis without photos', () => {
    const withLegacyKey = buildClientReportModel({
      scores,
      formData: {
        ...formData,
        postureImagesStorage_back: 'https://example.com/posture/back.jpg',
      } as unknown as FormData,
      goals: formData.clientGoals,
      gapAnalysisData,
      clientName: 'Sample Client',
      reportDate: 'Sep 13, 2026',
    });
    expect(withLegacyKey.posture?.images.back).toContain('https://');

    const analysisOnly = buildClientReportModel({
      scores,
      formData: {
        ...formData,
        postureAiResults: {
          front: { structuredFindings: [] },
        },
      } as unknown as FormData,
      goals: formData.clientGoals,
      gapAnalysisData,
      clientName: 'Sample Client',
      reportDate: 'Sep 13, 2026',
    });
    expect(analysisOnly.posture).not.toBeNull();
    expect(Object.keys(analysisOnly.posture?.images ?? {})).toHaveLength(0);
  });

  it('promises muscle gain (not a cut) when that is the primary goal', () => {
    const model = buildClientReportModel({
      scores,
      formData: { ...formData, clientGoals: ['build-muscle'] } as FormData,
      goals: ['build-muscle'],
      gapAnalysisData,
      clientName: 'Sample Client',
      reportDate: 'Sep 13, 2026',
    });
    expect(model.goalPromise).toMatch(/build muscle/i);
    expect(model.goalPromise).not.toMatch(/kg off the scale/i);
    expect(model.roadmapCards.find((c) => c.goalId === 'build-muscle')?.how).toMatch(
      /protein/i,
    );
  });

  it('places a female client among women, not men', () => {
    const model = buildClientReportModel({
      scores,
      formData: { ...formData, gender: 'female' } as FormData,
      goals: formData.clientGoals,
      gapAnalysisData,
      clientName: 'Sara',
      reportDate: 'Sep 13, 2026',
    });
    expect(model.welcome).toMatch(/for women aged/i);
    expect(model.welcome).not.toMatch(/for men aged/);
    expect(model.goalPromise).toMatch(/add muscle|kg off the scale/i);
  });

  it('carries captured tape and peak HR into the AXIS tables and never surfaces alcohol', () => {
    const model = buildClientReportModel({
      scores,
      formData: {
        ...formData,
        alcoholFrequency: 'never',
        waistCm: '91.5',
        hipsCm: '111',
        shouldersCm: '118',
        cardioPeakHr: '152',
        sleepArchetype: 'good',
        stressLevel: 'moderate',
      } as FormData,
      goals: formData.clientGoals,
      gapAnalysisData,
      clientName: 'Sample Client',
      reportDate: 'Sep 8, 2026',
    });

    expect(model.reportDate).toBe('Sep 8, 2026');
    const bodyComp = model.pillars.find((p) => p.scoringId === 'bodyComp');
    expect(bodyComp?.progressionRows.find((r) => r.name === 'Waist')).toBeUndefined();
    const tape = buildTapeMeasurementRows({
      ...formData,
      waistCm: '91.5',
      hipsCm: '111',
      shouldersCm: '118',
    } as FormData);
    expect(tape.find((r) => r.name === 'Waist')?.current).toBe('91.5');
    expect(tape.find((r) => r.name === 'Hips')?.current).toBe('111.0');

    const cardio = model.pillars.find((p) => p.scoringId === 'cardio');
    expect(cardio?.progressionRows.find((r) => r.name === 'Peak heart rate')).toEqual({
      name: 'Peak heart rate',
      unit: 'bpm',
      current: '152',
      oneMonth: '–',
      twelveWeeks: '–',
    });

    const { formData: _formData, ...visible } = model;
    expect(JSON.stringify(visible)).not.toMatch(/alcohol/i);
  });
});
