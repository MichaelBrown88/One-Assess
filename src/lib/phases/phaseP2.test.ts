import { describe, it, expect } from 'vitest';
import { phaseP2 } from './phaseP2';
import { phaseP4 } from './phaseP4';

describe('phaseP2 body-comp field grouping', () => {
  const section = phaseP2.sections?.[0];
  if (!section) throw new Error('P2 is missing its body-comp section');
  const fields = section.fields;

  it('groups height and weight on one card', () => {
    const height = fields.find((f) => f.id === 'heightCm');
    const weight = fields.find((f) => f.id === 'inbodyWeightKg');
    expect(height?.pairId).toBe('height-weight');
    expect(weight?.pairId).toBe('height-weight');
  });

  it('keeps tape measurements on their own grouped step after the analyzer', () => {
    const ids = fields.map((f) => f.id);
    const tape = fields.filter((f) => f.pairId === 'tape-measurements');
    expect(tape.length).toBeGreaterThan(2);
    expect(ids.indexOf('shouldersCm')).toBeGreaterThan(ids.indexOf('bmrKcal'));
    expect(ids).not.toContain('neckCm');
  });

  it('ends with posture photos after tape', () => {
    expect(phaseP2.sections?.map((s) => s.id)).toEqual(['body-comp', 'posture']);
  });
});

describe('phaseP4 movement only', () => {
  it('does not include the posture photo section', () => {
    expect(phaseP4.sections?.some((s) => s.id === 'posture')).toBe(false);
  });
});
