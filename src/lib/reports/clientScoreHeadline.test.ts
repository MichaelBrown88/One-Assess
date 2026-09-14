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

const mixed73 = summary(
  [
    { id: 'bodyComp', title: 'Body Composition', score: 62 },
    { id: 'strength', title: 'Functional Strength', score: 80 },
    { id: 'cardio', title: 'Metabolic Fitness', score: 73 },
    { id: 'movementQuality', title: 'Movement Quality', score: 70 },
    { id: 'lifestyle', title: 'Lifestyle Factors', score: 68 },
  ],
  73,
);

const ibrahim = { dateOfBirth: '1995-03-25', gender: 'male' };

describe('buildOverallResultsSummary', () => {
  it('uses placement, best finding, and two or three improvement areas', () => {
    const text = buildOverallResultsSummary(mixed73, null, ibrahim);
    expect(text).toMatch(/men aged 26–35/i);
    expect(text).toMatch(/73/);
    expect(text).toMatch(/above typical/i);
    expect(text).toMatch(/Strength is your best result today/);
    expect(text).toMatch(/body composition/i);
    expect(text).toMatch(/lifestyle/i);
    expect(text).toMatch(/movement/i);
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim());
    expect(sentences.length).toBeGreaterThanOrEqual(3);
    expect(sentences.length).toBeLessThanOrEqual(3);
    expect(text).not.toMatch(CLIENT_COPY_FORBIDDEN);
    expect(text.toLowerCase()).not.toMatch(/focus this block|90-day|vo2|12-week|diagnosis/);
  });

  it('does not mention a prior assessment when there is no previous score', () => {
    const text = buildOverallResultsSummary(mixed73, null, ibrahim);
    expect(text.toLowerCase()).not.toMatch(/from last time|improved|up \d/);
  });

  it('adds a score delta on reassessment without changing the three-beat shape', () => {
    const text = buildOverallResultsSummary(mixed73, 70, ibrahim);
    expect(text).toMatch(/up 3 from last time/);
    expect(text).toMatch(/Strength is your best result today/);
    expect(text.split(/[.!?]+/).filter((s) => s.trim())).toHaveLength(3);
  });

  it('still places the score when age or gender is missing', () => {
    const text = buildOverallResultsSummary(mixed73, null);
    expect(text).toMatch(/sits above typical on this assessment/);
    expect(text).not.toMatch(/men aged|women aged/);
  });

  it('uses the female peer group when the client is a woman', () => {
    const text = buildOverallResultsSummary(mixed73, null, {
      dateOfBirth: '1995-03-25',
      gender: 'female',
    });
    expect(text).toMatch(/Among women aged 26–35/i);
    expect(text).not.toMatch(/Among men aged/);
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
