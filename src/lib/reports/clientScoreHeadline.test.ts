import { describe, expect, it } from 'vitest';
import { buildClientScoreHeadline, buildOverallResultsSummary } from './clientScoreHeadline';
import { CLIENT_COPY_FORBIDDEN } from './sanitizeClientReportCopy';
import type { ScoreSummary } from '@/lib/scoring';

function summary(partial: Partial<ScoreSummary['categories'][number]>[] , overall: number): ScoreSummary {
  return {
    overall,
    fullProfileScore: overall,
    synthesis: [],
    categories: partial.map((c) => ({
      id: 'bodyComp',
      title: 'Body Composition',
      score: 70,
      assessed: true,
      details: [],
      strengths: [],
      weaknesses: [],
      ...c,
    })),
  };
}

describe('buildOverallResultsSummary', () => {
  it('summarises a mixed 73 in two or three sentences', () => {
    const scores = summary(
      [
        { id: 'bodyComp', title: 'Body Composition', score: 62 },
        { id: 'strength', title: 'Functional Strength', score: 80 },
        { id: 'cardio', title: 'Metabolic Fitness', score: 73 },
        { id: 'movementQuality', title: 'Movement Quality', score: 70 },
        { id: 'lifestyle', title: 'Lifestyle Factors', score: 68 },
      ],
      73,
    );
    const text = buildOverallResultsSummary(scores, null);
    expect(text).toMatch(/solid/i);
    expect(text).toMatch(/strength/i);
    expect(text).toMatch(/body composition/i);
    expect(text.split(/[.!?]+/).filter((s) => s.trim()).length).toBeLessThanOrEqual(3);
    expect(text).not.toMatch(CLIENT_COPY_FORBIDDEN);
    expect(text.toLowerCase()).not.toMatch(/focus this block|90-day|vo2/);
  });

  it('does not mention a prior assessment when there is no previous score', () => {
    const scores = summary([{ id: 'strength', score: 80 }], 73);
    const text = buildOverallResultsSummary(scores, null);
    expect(text.toLowerCase()).not.toMatch(/improved|last time|before/);
  });

  it('mentions improvement when the overall score rose', () => {
    const scores = summary([{ id: 'strength', score: 80 }], 73);
    const text = buildOverallResultsSummary(scores, 70);
    expect(text.toLowerCase()).toMatch(/improved/);
  });
});

describe('buildClientScoreHeadline', () => {
  it('still returns a short strength / gap line', () => {
    const scores = summary(
      [
        { id: 'strength', score: 80 },
        { id: 'lifestyle', score: 50 },
      ],
      65,
    );
    expect(buildClientScoreHeadline(scores)).toMatch(/lifestyle/i);
  });
});
