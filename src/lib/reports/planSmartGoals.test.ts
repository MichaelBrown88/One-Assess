import { describe, expect, it } from 'vitest';
import type { FormData } from '@/contexts/FormContext';
import type { GapAnalysisData } from '@/components/reports/useGapAnalysisData';
import type { ScoreSummary } from '@/lib/scoring';
import { CLIENT_PLAN_WEEKS, CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { SAMPLE_PREVIEW_FORM, SAMPLE_PREVIEW_SCORES } from '@/constants/sampleClientReport';
import { CALENDAR_MONTH_WEEKS, buildPlanSmartGoals } from './planSmartGoals';
import { projectAtCalendarMonth } from './clientProgressionRows';
import { OPTIMAL_FITNESS_SCORE, OPTIMAL_RESTING_HR } from './clientProgressionProjections';
import { reportPlanSessions, withReportLiftingSessions } from './plannedTraining';

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

const sampleGaps: GapAnalysisData[] = [
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
      endurance: { current: 65, target: 80, gap: 15 },
      core: { current: 50, target: 70, gap: 20 },
      strength: { current: 42, target: 50, gap: 8 },
    },
  },
  {
    ...emptyGap,
    cardioGaps: {
      vo2: { current: 0, target: 0, gap: 0 },
      rhr: { current: 68, target: 60, gap: -8 },
      recovery: { current: 34, target: 40, gap: 6 },
    },
  },
];

function plannedForm(extra: Partial<FormData> = {}): FormData {
  const raw = { ...SAMPLE_PREVIEW_FORM, ...extra };
  return withReportLiftingSessions(raw, reportPlanSessions(raw));
}

describe('projectAtCalendarMonth', () => {
  it('scales the plan change by one calendar month (52/12 weeks)', () => {
    const frac = CALENDAR_MONTH_WEEKS / CLIENT_PLAN_WEEKS;
    const expected = (81.2 + (77.1 - 81.2) * frac).toFixed(1);
    expect(projectAtCalendarMonth('81.2', '77.1')).toBe(expected);
  });

  it('passes through blank plan values', () => {
    expect(projectAtCalendarMonth('152', '–')).toBe('–');
  });
});

describe('buildPlanSmartGoals', () => {
  it('builds body-comp, tape (bicep wording), and goal-led performance rows', () => {
    const form = plannedForm({ gripLeftKg: '40', gripRightKg: '42' });
    const goals = buildPlanSmartGoals(form, SAMPLE_PREVIEW_SCORES, form.clientGoals, sampleGaps);

    const weight = goals.find((g) => g.id === 'bc-weight');
    expect(weight).toBeDefined();
    expect(Number(weight!.at16Weeks)).toBeLessThan(Number(weight!.current));
    expect(Number(weight!.at1Month)).toBeGreaterThan(Number(weight!.at16Weeks));
    expect(Number(weight!.at1Month)).toBeLessThan(Number(weight!.current));
    expect(weight!.smartLine).toContain('1 month');
    expect(weight!.smartLine).toContain(`${CLIENT_PLAN_WEEKS} weeks`);
    expect(weight!.smartLine).not.toContain('\u2014');
    expect(weight!.smartLine.toLowerCase()).not.toContain('everfit');

    const leftBicep = goals.find((g) => g.label === CLIENT_REPORT_COPY.planSmartGoalBicepLeft);
    const rightBicep = goals.find((g) => g.label === CLIENT_REPORT_COPY.planSmartGoalBicepRight);
    expect(leftBicep).toBeDefined();
    expect(rightBicep).toBeDefined();

    const waist = goals.find((g) => g.label === 'Waist');
    expect(waist).toBeDefined();
    expect(Number(waist!.at16Weeks)).toBeLessThanOrEqual(Number(waist!.current));

    const performance = goals.filter((g) => g.category === 'performance');
    expect(performance.map((g) => g.id)).toEqual(
      expect.arrayContaining(['perf-pushups', 'perf-squats', 'perf-grip', 'perf-plank']),
    );
    expect(performance.find((g) => g.id === 'perf-pushups')?.label).toBe(
      CLIENT_REPORT_COPY.planSmartGoalPushups,
    );
    expect(performance.find((g) => g.id === 'perf-grip')?.label).toBe(
      CLIENT_REPORT_COPY.planSmartGoalGrip,
    );
  });

  it('omits missing metrics and skips grip when not assessed', () => {
    const form = plannedForm({
      pushupsOneMinuteReps: '',
      squatsOneMinuteReps: '',
      plankDurationSeconds: '',
      gripLeftKg: '',
      gripRightKg: '',
      armLeftCm: '',
      armRightCm: '',
    });
    const goals = buildPlanSmartGoals(form, SAMPLE_PREVIEW_SCORES, form.clientGoals, sampleGaps);
    expect(goals.some((g) => g.id === 'perf-grip')).toBe(false);
    expect(goals.some((g) => g.id === 'perf-pushups')).toBe(false);
    expect(goals.some((g) => g.label === CLIENT_REPORT_COPY.planSmartGoalBicepLeft)).toBe(false);
    expect(goals.some((g) => g.id === 'bc-weight')).toBe(true);
  });

  it('respects optimal cardio caps', () => {
    const scores: ScoreSummary = {
      ...SAMPLE_PREVIEW_SCORES,
      categories: SAMPLE_PREVIEW_SCORES.categories.map((c) =>
        c.id === 'cardio' ? { ...c, score: 96, assessed: true } : c,
      ),
    };
    const gaps: GapAnalysisData[] = [
      sampleGaps[0],
      sampleGaps[1],
      {
        ...emptyGap,
        cardioGaps: {
          vo2: { current: 0, target: 0, gap: 0 },
          rhr: { current: 54, target: 52, gap: -2 },
          recovery: { current: 48, target: 50, gap: 2 },
        },
      },
    ];
    const form = plannedForm({ clientGoals: ['improve-fitness'] });
    const goals = buildPlanSmartGoals(form, scores, form.clientGoals, gaps);
    const fitness = goals.find((g) => g.id === 'perf-fitness');
    const rhr = goals.find((g) => g.id === 'perf-rhr');
    if (fitness) {
      expect(Number(fitness.at16Weeks)).toBeLessThanOrEqual(OPTIMAL_FITNESS_SCORE);
    }
    if (rhr) {
      expect(Number(rhr.at16Weeks)).toBeGreaterThanOrEqual(OPTIMAL_RESTING_HR);
    }
  });

  it('uses a single plan session dose (4 by default)', () => {
    const form = plannedForm();
    expect(reportPlanSessions(form)).toBe(4);
    const goals = buildPlanSmartGoals(form, SAMPLE_PREVIEW_SCORES, form.clientGoals, sampleGaps);
    expect(goals.length).toBeGreaterThan(0);
  });

  it('returns empty when form data is missing', () => {
    expect(buildPlanSmartGoals(undefined, undefined, undefined, [])).toEqual([]);
  });
});
