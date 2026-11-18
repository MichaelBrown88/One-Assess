import { describe, expect, it } from 'vitest';
import { resolveDraftPhaseIndex, isPersistablePhaseId } from './draftNavigation';

const studio = ['P3', 'P4', 'P5', 'P2', 'P7'];
describe('draft phase restoration', () => {
  it('follows the step ID when intake removal shortens the plan', () => {
    expect(resolveDraftPhaseIndex(studio, 'P2', 5)).toBe(3);
    expect(resolveDraftPhaseIndex(studio, 'P3', 2)).toBe(0);
  });
  it('repairs legacy empty/out-of-range positions without opening Results', () => {
    for (const id of ['empty', 'P6', null]) {
      expect(resolveDraftPhaseIndex(studio, id, 5)).toBe(3);
      expect(resolveDraftPhaseIndex(studio, id, 999)).toBe(3);
    }
    expect(isPersistablePhaseId('empty')).toBe(false);
  });
  it('handles unset, negative and invalid positions', () => {
    for (const index of [null, -1, NaN, 0.5]) expect(resolveDraftPhaseIndex(studio, null, index)).toBe(0);
    expect(resolveDraftPhaseIndex([], null, 5)).toBe(0);
  });
  it('allows deliberately selecting Results by its valid ID', () => {
    expect(resolveDraftPhaseIndex(studio, 'P7', 4)).toBe(4);
  });
});
