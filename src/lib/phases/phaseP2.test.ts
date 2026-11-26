import { describe, it, expect } from 'vitest';
import { phaseP2 } from './phaseP2';
import { phaseP4 } from './phaseP4';

describe('phaseP2 InBody → tape → posture', () => {
  it('exposes three sections in order', () => {
    expect(phaseP2.sections?.map((s) => s.id)).toEqual([
      'inbody-results',
      'tape-measurements',
      'posture',
    ]);
  });

  it('shows InBody fields without a hide toggle', () => {
    const inbody = phaseP2.sections?.find((s) => s.id === 'inbody-results');
    if (!inbody) throw new Error('missing inbody-results');
    const ids = inbody.fields.map((f) => f.id);
    expect(ids).toContain('inbodyWeightKg');
    expect(ids).toContain('skeletalMuscleMassKg');
    expect(ids).not.toContain('segmentalArmLeftKg');
    expect(ids).not.toContain('bmrKcal');
    expect(ids).not.toContain('bodyFatMassKg');
    expect(inbody.fields.every((f) => !f.conditional)).toBe(true);
  });

  it('keeps tape in its own section after InBody', () => {
    const tape = phaseP2.sections?.find((s) => s.id === 'tape-measurements');
    if (!tape) throw new Error('missing tape-measurements');
    const ids = tape.fields.map((f) => f.id);
    expect(ids[0]).toBe('shouldersCm');
    expect(ids).not.toContain('neckCm');
    expect(ids).not.toContain('inbodyWeightKg');
  });
});

describe('phaseP4 movement only', () => {
  it('does not include the posture photo section', () => {
    expect(phaseP4.sections?.some((s) => s.id === 'posture')).toBe(false);
  });
});
