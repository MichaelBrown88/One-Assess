import { describe, expect, it } from 'vitest';
import { initialFormData, type FormData } from '@/types/assessmentForm';
import { computeScores } from './computeScores';
import { scoreMovementQuality } from './movementQualityScoring';

const withAi = (ai: unknown): FormData => ({ ...initialFormData, postureAiResults: ai as FormData['postureAiResults'] });

describe('scoreMovementQuality with posture AI results', () => {
  it('does not score or mark assessed when the AI results hold no findings', () => {
    for (const ai of [{}, { front: {} }, { 'side-right': {}, back: {} }]) {
      const result = scoreMovementQuality(withAi(ai), 30, 'male');
      expect(result.assessed).toBe(false);
      expect(result.score).toBe(0);
      expect(result.details.find((d) => d.id === 'posture')?.value).toBe('-');
    }
  });

  it('keeps an otherwise empty assessment at an overall score of 0', () => {
    const scores = computeScores(withAi({}));
    expect(scores.overall).toBe(0);
    expect(scores.categories.every((c) => !c.assessed)).toBe(true);
  });

  it('still scores posture from the findings that are present', () => {
    const result = scoreMovementQuality(
      withAi({ 'side-right': { forward_head: { status: 'Moderate' } } }),
      30,
      'male',
    );
    expect(result.assessed).toBe(true);
    expect(result.score).toBe(75);
  });

  it('scores neutral findings as 100', () => {
    const result = scoreMovementQuality(
      withAi({ front: { shoulder_alignment: { status: 'Neutral', height_difference_cm: 0.2 } } }),
      30,
      'male',
    );
    expect(result.assessed).toBe(true);
    expect(result.score).toBe(100);
  });
});
