import { describe, expect, it, vi } from 'vitest';
import { SAMPLE_PREVIEW_FORM, SAMPLE_PREVIEW_SCORES } from '@/constants/sampleClientReport';
import { lifestyleFactorForSessions } from '@/lib/physiology/rates';
import { buildClientNinetyDayTarget } from './clientNinetyDayTarget';
import { buildBodyCompProgressionRows, buildStrengthProgressionRows } from './clientProgressionProjections';
import { parseClientGoals } from '@/lib/goals/goalContext';
import { withReportLiftingSessions, reportTrainingWeek } from './plannedTraining';
import { buildClientReportModel } from './buildClientReportModel';

const form = { ...withReportLiftingSessions(SAMPLE_PREVIEW_FORM, 4), assessedAt: '2026-09-08T12:00:00.000Z' };
const goals = parseClientGoals(form);

describe('reviewed report plan', () => {
  it('does not assume sleep and stress improve when another visit is added', () => {
    const profile = { sex: 'male' as const, age: 31, bodyWeightKg: 81.2, trainingFrequency: 4,
      trainingExperience: 'beginner' as const, sleepScore: 30, stressScore: 30 };
    expect(lifestyleFactorForSessions(profile, 4)).toBeLessThan(1);
    expect(lifestyleFactorForSessions(profile, 5)).toBe(lifestyleFactorForSessions(profile, 3));
  });

  it('keeps conditioning inside the proposed visits', () => {
    const week = reportTrainingWeek(form, goals);
    expect(week.visits).toBe(4);
    expect(week.liftingSessions).toBe(4);
    expect(week.conditioningSessions).toBe(2);
    expect(week.conditioningPlacement).toBe('within-visits');
  });

  it('reconciles muscle and fat with total weight without an unexplained lean-mass loss', () => {
    const target = buildClientNinetyDayTarget(form, SAMPLE_PREVIEW_SCORES, goals)!;
    const body = target.bodyComposition!;
    expect(body.weightKg).toBeLessThan(81.2);
    expect(body.muscleKg).toBeGreaterThan(31.5);
    const otherLeanNow = 81.2 * (1 - 0.312) - 31.5;
    expect(body.weightKg - body.fatKg! - body.muscleKg!).toBeCloseTo(otherLeanNow, 8);
    const rows = buildBodyCompProgressionRows(form, SAMPLE_PREVIEW_SCORES, form.clientGoals);
    expect(Number(rows.find(r => r.name === 'Body weight')!.twelveWeeks)).toBe(target.targetWeightKg);
    expect(target.monthlyWeightChangeKg).toBeCloseTo(target.weightDeltaKg! / (16 * 12 / 52), 1);
  });

  it('uses slower loss for simultaneous muscle building and keeps macro energy consistent', () => {
    const cut = buildClientNinetyDayTarget(form, SAMPLE_PREVIEW_SCORES, parseClientGoals(form, ['weight-loss']))!;
    const combined = buildClientNinetyDayTarget(form, SAMPLE_PREVIEW_SCORES, goals)!;
    expect(Math.abs(combined.weightDeltaKg!)).toBeLessThan(Math.abs(cut.weightDeltaKg!));
    expect(combined.proteinG).toBe(180);
    expect(Math.abs(combined.proteinG! * 4 + combined.carbsG! * 4 + combined.fatG! * 9 - combined.calories!)).toBeLessThanOrEqual(10);
  });

  it('holds healthy body metrics outside the stated goal and never fills missing strength tests', () => {
    const healthy = { ...form, inbodyBodyFatPct: '18', clientGoals: ['improve-fitness'] };
    const target = buildClientNinetyDayTarget(healthy, SAMPLE_PREVIEW_SCORES, parseClientGoals(healthy))!;
    expect(target.weightDeltaKg).toBe(0);
    expect(target.bodyComposition?.muscleKg).toBe(31.5);
    expect(buildStrengthProgressionRows({ ...form, pushupsOneMinuteReps: '', pushupMaxReps: '', squatsOneMinuteReps: '', gripLeftKg: '', gripRightKg: '', plankDurationSeconds: '' }, [])).toEqual([]);
  });

  it('retains a measured zero without treating an empty field as a measurement', () => {
    const rows = buildStrengthProgressionRows({ ...form, pushupsOneMinuteReps: '0', squatsOneMinuteReps: '',
      gripLeftKg: '', gripRightKg: '', plankDurationSeconds: '' }, form.clientGoals);
    expect(rows).toHaveLength(1);
    expect(rows[0].current).toBe('0');
    expect(rows[0].changeAtPlan).toBe(0);
  });

  it('keeps the original assessment age when a saved report is reopened', () => {
    const build = () => buildClientNinetyDayTarget(form, SAMPLE_PREVIEW_SCORES, goals);
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-11-16'));
      const first = build();
      vi.setSystemTime(new Date('2036-11-16'));
      expect(build()).toEqual(first);
    } finally { vi.useRealTimers(); }
  });

  it('feeds one set of rows to the report and plan, with review actions for each goal', () => {
    const model = buildClientReportModel({ scores: SAMPLE_PREVIEW_SCORES, formData: form,
      goals: form.clientGoals, gapAnalysisData: [], clientName: 'Sam', reportDate: 'Sep 8, 2026' });
    expect(model.roadmapCards).toHaveLength(3);
    expect(model.roadmapCards.every(c => c.track && c.review)).toBe(true);
    expect(model.trainingWeek.visits).toBe(4);
    const weight = model.pillars.find(p => p.scoringId === 'bodyComp')?.progressionRows.find(r => r.name === 'Body weight');
    expect(Number(weight?.twelveWeeks)).toBe(model.roadmapTarget?.targetWeightKg);
  });
});
