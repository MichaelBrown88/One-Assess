import { describe, expect, it } from 'vitest';
import { buildClientRoadmapCards } from './clientRoadmapCards';
import { parseClientGoals } from '@/lib/goals/goalContext';
import { CLIENT_COPY_FORBIDDEN } from '@/lib/reports/sanitizeClientReportCopy';
import { projectClientTwelveWeekWeightLoss } from '@/lib/reports/clientTwelveWeekWeight';
import type { FormData } from '@/contexts/FormContext';

const weightLossCtx = parseClientGoals(undefined, ['weight-loss']);
const fitnessCtx = parseClientGoals(undefined, ['improve-fitness']);

describe('buildClientRoadmapCards', () => {
  it('returns one card per pillar in the given (goal-priority) order', () => {
    const cards = buildClientRoadmapCards(
      [
        { scoringId: 'bodyComp', score: 60 },
        { scoringId: 'cardio', score: 45 },
        { scoringId: 'lifestyle', score: 70 },
      ],
      undefined,
      weightLossCtx,
    );
    expect(cards.map((c) => c.pillar)).toEqual(['bodyComp', 'cardio', 'lifestyle']);
  });

  it('gives concrete cardio prescriptions (easy talking pace + frequency)', () => {
    const cards = buildClientRoadmapCards(
      [{ scoringId: 'cardio', score: 45 }],
      undefined,
      fitnessCtx,
    );
    const text = cards[0]?.prescriptions.join(' ') ?? '';
    expect(text).toMatch(/talk/i);
    expect(text).toMatch(/week/i);
    expect(text).not.toMatch(CLIENT_COPY_FORBIDDEN);
  });

  it('computes a protein target in grams from bodyweight for weight loss', () => {
    const formData = { inbodyWeightKg: '80' } as FormData;
    const cards = buildClientRoadmapCards(
      [{ scoringId: 'bodyComp', score: 55 }],
      formData,
      weightLossCtx,
    );
    const text = cards[0]?.prescriptions.join(' ') ?? '';
    expect(text).toMatch(/160g a day/);
    expect(text).toMatch(/eat a little less than you burn/i);
    expect(text).not.toMatch(CLIENT_COPY_FORBIDDEN);
  });

  it('matches the 12-week engine weekly rate on the fat-loss line', () => {
    const formData = {
      inbodyWeightKg: '81.2',
      inbodyBodyFatPct: '31.2',
      heightCm: '175',
      gender: 'male',
      dateOfBirth: '1995-03-25',
      clientGoals: ['weight-loss', 'build-muscle'],
    } as FormData;
    const ctx = parseClientGoals(formData, formData.clientGoals);
    const projection = projectClientTwelveWeekWeightLoss(formData, undefined, formData.clientGoals);
    const cards = buildClientRoadmapCards(
      [{ scoringId: 'bodyComp', score: 55 }],
      formData,
      ctx,
    );
    const text = cards[0]?.prescriptions.join(' ') ?? '';
    expect(projection).not.toBeNull();
    expect(text).toContain(`${projection!.weeklyRateKg.toFixed(2)} kg a week`);
  });

  it('surfaces concrete lifestyle levers for the flagged factors', () => {
    const formData = { sleepQuality: 'poor', lastCaffeineIntake: '16:00' } as FormData;
    const cards = buildClientRoadmapCards(
      [{ scoringId: 'lifestyle', score: 50 }],
      formData,
      weightLossCtx,
    );
    const text = cards[0]?.prescriptions.join(' ') ?? '';
    expect(text).toMatch(/7\.5\u20139 h sleep|7\.5/);
    expect(text).toMatch(/no caffeine after 2pm/i);
  });

  it('congratulates and maintains healthy pillars instead of pushing hard targets', () => {
    const cards = buildClientRoadmapCards(
      [{ scoringId: 'cardio', score: 85 }],
      undefined,
      weightLossCtx,
    );
    expect(cards[0]?.title).toBe('Keep the fitness you have');
  });
});
