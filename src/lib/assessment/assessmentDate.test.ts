import { describe, expect, it } from 'vitest';
import { assessmentDate } from './assessmentDate';
describe('original assessment dates', () => {
  it('uses capture time instead of later generation time', () => {
    expect(assessmentDate('2026-09-21T19:00:43.057Z', new Date('2026-11-16T18:08:59Z'))?.toISOString()).toBe('2026-09-21T19:00:43.057Z');
  });
  it('falls back for legacy or invalid metadata without inventing today', () => {
    const saved = new Date('2026-11-16T10:00:59.494Z');
    expect(assessmentDate(undefined, saved)).toEqual(saved);
    expect(assessmentDate('invalid', saved)).toEqual(saved);
    expect(assessmentDate('')).toBeNull();
  });
});
