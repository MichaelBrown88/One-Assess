import { describe, expect, it } from 'vitest';
import { buildClientReportModel } from './buildClientReportModel';
import { CLIENT_COPY_FORBIDDEN } from './sanitizeClientReportCopy';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';
import type { GapAnalysisData } from '@/components/reports/useGapAnalysisData';

const formData = {
  inbodyWeightKg: '81.2',
  inbodyBodyFatPct: '31.2',
  skeletalMuscleMassKg: '31.5',
  heightCm: '175',
  gender: 'male',
  dateOfBirth: '1995-03-25',
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
  it('prints a 12-week promise and Fitness level as the 0–100 score, not VO2', () => {
    const model = buildClientReportModel({
      scores,
      formData,
      goals: formData.clientGoals,
      gapAnalysisData,
      clientName: 'Ibrahim Al Tuwaijri',
      reportDate: 'Sep 13, 2026',
    });

    expect(model.goalPromise).toMatch(/12 weeks/);
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
    expect(Number(weightRow!.twelveWeeks)).toBeCloseTo(model.roadmapTarget!.targetWeightKg!, 0);

    expect(model.priorityFocus).toEqual({ label: 'Body composition', score: 62 });
    expect(model.welcome).toMatch(/Among men aged 26–35/i);
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
      clientName: 'Ibrahim Al Tuwaijri',
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
      clientName: 'Ibrahim Al Tuwaijri',
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
      clientName: 'Ibrahim Al Tuwaijri',
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
      clientName: 'Ibrahim Al Tuwaijri',
      reportDate: 'Sep 13, 2026',
    });
    expect(model.goalPromise).toMatch(/build muscle/i);
    expect(model.goalPromise).not.toMatch(/kg off the scale/i);
    expect(model.roadmapCards.find((c) => c.pillar === 'bodyComp')?.prescriptions.join(' ')).toMatch(
      /holds or slowly rises/i,
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
    expect(model.welcome).toMatch(/Among women aged/i);
    expect(model.welcome).not.toMatch(/Among men aged/);
    expect(model.goalPromise).toMatch(/add muscle|kg off the scale/i);
  });
});
