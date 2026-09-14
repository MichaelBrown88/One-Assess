import { describe, expect, it } from 'vitest';
import { buildClientRoadmapCards } from './clientRoadmapCards';
import { parseClientGoals } from '@/lib/goals/goalContext';
import { CLIENT_COPY_FORBIDDEN } from '@/lib/reports/sanitizeClientReportCopy';
import type { FormData } from '@/contexts/FormContext';

const weightLossCtx = parseClientGoals(undefined, ['weight-loss']);
const muscleCtx = parseClientGoals(undefined, ['build-muscle']);
const fitnessCtx = parseClientGoals(undefined, ['improve-fitness']);

function firstLine(
  scoringId: 'bodyComp' | 'strength' | 'cardio' | 'movementQuality' | 'lifestyle',
  score: number,
  ctx = weightLossCtx,
  formData?: FormData,
): string {
  const cards = buildClientRoadmapCards([{ scoringId, score }], formData, ctx);
  return cards[0]?.prescriptions[0] ?? '';
}

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

  it('leads fat-loss body comp with palm protein and smaller portions', () => {
    const text = firstLine('bodyComp', 55, weightLossCtx);
    expect(text).toMatch(/palm-sized protein/i);
    expect(text).toMatch(/portions/i);
    expect(text).toMatch(/moving the right way/i);
    expect(text).not.toMatch(CLIENT_COPY_FORBIDDEN);
  });

  it('leads muscle-gain body comp with palm protein and enough food', () => {
    const text = firstLine('bodyComp', 70, muscleCtx);
    expect(text).toMatch(/palm-sized protein/i);
    expect(text).toMatch(/holds or slowly rises/i);
    expect(text).not.toMatch(CLIENT_COPY_FORBIDDEN);
  });

  it('gives 3–4 lifting sessions and a simple weekly load bump', () => {
    const cards = buildClientRoadmapCards(
      [{ scoringId: 'strength', score: 78 }],
      undefined,
      weightLossCtx,
    );
    expect(cards[0]?.prescriptions[0]).toMatch(/3–4 lifting sessions a week/i);
    expect(cards[0]?.prescriptions[1]).toMatch(/add a little weight each week/i);
    expect(cards[0]?.prescriptions.join(' ')).not.toMatch(CLIENT_COPY_FORBIDDEN);
  });

  it('gives two easy, conversational cardio sessions', () => {
    const text = firstLine('cardio', 45, fitnessCtx);
    expect(text).toMatch(/2 easy/i);
    expect(text).toMatch(/low-heart-rate/i);
    expect(text).toMatch(/talk/i);
    expect(text).toMatch(/nose/i);
    expect(text).not.toMatch(CLIENT_COPY_FORBIDDEN);
  });

  it('gives warm-up, full range, and stretch after for movement', () => {
    const text = firstLine('movementQuality', 72);
    expect(text).toMatch(/warm up/i);
    expect(text).toMatch(/full range of motion/i);
    expect(text).toMatch(/stretch/i);
    expect(text).not.toMatch(CLIENT_COPY_FORBIDDEN);
  });

  it('leads recovery with sleep and last meal, then caffeine when flagged', () => {
    const formData = { sleepQuality: 'poor', lastCaffeineIntake: '16:00' } as FormData;
    const cards = buildClientRoadmapCards(
      [{ scoringId: 'lifestyle', score: 50 }],
      formData,
      weightLossCtx,
    );
    expect(cards[0]?.prescriptions[0]).toMatch(/bedtime/i);
    expect(cards[0]?.prescriptions[0]).toMatch(/last meal/i);
    expect(cards[0]?.prescriptions.join(' ')).toMatch(/caffeine/i);
    expect(cards[0]?.prescriptions.join(' ')).not.toMatch(CLIENT_COPY_FORBIDDEN);
  });

  it('congratulates and maintains healthy pillars instead of pushing hard targets', () => {
    const cards = buildClientRoadmapCards(
      [{ scoringId: 'cardio', score: 85 }],
      undefined,
      weightLossCtx,
    );
    expect(cards[0]?.title).toBe('Keep the fitness you have');
  });

  it('does not prescribe a cut when the goal is muscle gain, even at a modest body-comp score', () => {
    const text = firstLine('bodyComp', 52, muscleCtx);
    expect(text).toMatch(/holds or slowly rises/i);
    expect(text).not.toMatch(/trim portions/i);
  });

  it('does not prescribe a cut for general-health when body-comp is merely modest', () => {
    const generalCtx = parseClientGoals(undefined, ['general-health']);
    const text = firstLine('bodyComp', 52, generalCtx);
    expect(text).toMatch(/keep portions steady/i);
    expect(text).not.toMatch(/trim portions/i);
  });
});
