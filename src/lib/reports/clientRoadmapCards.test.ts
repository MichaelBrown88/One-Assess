import { describe, expect, it } from 'vitest';
import { buildClientRoadmapCards } from './clientRoadmapCards';
import { parseClientGoals } from '@/lib/goals/goalContext';
import { CLIENT_COPY_FORBIDDEN } from '@/lib/reports/sanitizeClientReportCopy';
import type { FormData } from '@/contexts/FormContext';

const weightLossCtx = parseClientGoals(undefined, ['weight-loss']);
const muscleCtx = parseClientGoals(undefined, ['build-muscle']);
const fitnessCtx = parseClientGoals(undefined, ['improve-fitness']);
const multiCtx = parseClientGoals(undefined, ['weight-loss', 'build-muscle', 'improve-fitness']);

const pillars = [
  { scoringId: 'bodyComp' as const, score: 55 },
  { scoringId: 'strength' as const, score: 70 },
  { scoringId: 'cardio' as const, score: 45 },
  { scoringId: 'movementQuality' as const, score: 72 },
  { scoringId: 'lifestyle' as const, score: 50 },
];

describe('buildClientRoadmapCards', () => {
  it('returns one card per stated goal in the order the client chose', () => {
    const cards = buildClientRoadmapCards(pillars, undefined, multiCtx, {
      monthlyWeightChangeKg: -0.5,
    });
    expect(cards.map((c) => c.goalId)).toEqual([
      'weight-loss',
      'build-muscle',
      'improve-fitness',
    ]);
    expect(cards.map((c) => c.label)).toEqual([
      'Weight loss',
      'Build muscle',
      'Improve fitness',
    ]);
  });

  it('does not invent a card per assessment pillar', () => {
    const cards = buildClientRoadmapCards(pillars, undefined, weightLossCtx);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.goalId).toBe('weight-loss');
  });

  it('names a concrete monthly pace for weight loss when available', () => {
    const [c] = buildClientRoadmapCards(pillars, undefined, weightLossCtx, {
      monthlyWeightChangeKg: -0.6,
    });
    expect(c?.smartGoal).toMatch(/0\.6 kg less per month/i);
    expect(c?.how).toMatch(/protein/i);
    expect(c?.how).toMatch(/food/i);
    expect(`${c?.smartGoal} ${c?.how}`).not.toMatch(CLIENT_COPY_FORBIDDEN);
  });

  it('leads muscle-gain with enough food when cutting is not a goal', () => {
    const [c] = buildClientRoadmapCards(pillars, undefined, muscleCtx);
    expect(c?.smartGoal).toMatch(/muscle/i);
    expect(c?.how).toMatch(/protein/i);
    expect(`${c?.smartGoal} ${c?.how}`).not.toMatch(CLIENT_COPY_FORBIDDEN);
  });

  it('keeps muscle on a cut when weight loss is also selected', () => {
    const cards = buildClientRoadmapCards(pillars, undefined, multiCtx);
    const muscle = cards.find((c) => c.goalId === 'build-muscle');
    expect(muscle?.smartGoal).toMatch(/while losing fat/i);
    expect(muscle?.how).toMatch(/protein/i);
    expect(`${muscle?.smartGoal} ${muscle?.how}`).not.toMatch(CLIENT_COPY_FORBIDDEN);
  });

  it('gives the locked lifting week and a simple weekly load bump for strength goals', () => {
    const ctx = parseClientGoals(undefined, ['build-strength']);
    const [c] = buildClientRoadmapCards(pillars, undefined, ctx);
    expect(c?.how).toMatch(/lifting week above/i);
    expect(c?.how).toMatch(/add weight or a rep/i);
    expect(c?.smartGoal).toMatch(/16/i);
    expect(`${c?.smartGoal} ${c?.how}`).not.toMatch(CLIENT_COPY_FORBIDDEN);
  });

  it('gives two easy, conversational cardio sessions for fitness goals', () => {
    const [c] = buildClientRoadmapCards(pillars, undefined, fitnessCtx);
    expect(c?.how).toMatch(/2 easy/i);
    expect(c?.how).toMatch(/talking pace/i);
    expect(`${c?.smartGoal} ${c?.how}`).not.toMatch(CLIENT_COPY_FORBIDDEN);
  });

  it('does not invent a goal when none was captured', () => {
    const cards = buildClientRoadmapCards(
      pillars,
      { sleepQuality: 'poor', lastCaffeineIntake: '16:00' } as FormData,
      parseClientGoals(undefined, []),
    );
    expect(cards).toEqual([]);
  });
});
