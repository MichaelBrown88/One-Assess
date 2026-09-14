import { describe, expect, it } from 'vitest';
import { classifySidePelvicTilt, hipAnteriorOffsetNorm } from './postureMath';

describe('hipAnteriorOffsetNorm', () => {
  it('is positive when the hip sits anterior of the shoulder–ankle line (side-left)', () => {
    const offset = hipAnteriorOffsetNorm(
      { x: 0.5, y: 0.25 },
      { x: 0.47, y: 0.5 },
      { x: 0.5, y: 0.9 },
      'side-left',
    );
    expect(offset).toBeGreaterThan(0.02);
  });

  it('flags anterior tilt when the hip is on the plumb but ahead of the shoulder', () => {
    const offset = hipAnteriorOffsetNorm(
      { x: 0.52, y: 0.25 },
      { x: 0.5, y: 0.5 },
      { x: 0.5, y: 0.9 },
      'side-left',
    );
    expect(offset).toBeGreaterThan(0.015);
  });

  it('is near zero when shoulder, hip, and ankle stack', () => {
    const offset = hipAnteriorOffsetNorm(
      { x: 0.5, y: 0.25 },
      { x: 0.5, y: 0.5 },
      { x: 0.5, y: 0.9 },
      'side-right',
    );
    expect(Math.abs(offset)).toBeLessThan(0.005);
  });
});

describe('classifySidePelvicTilt', () => {
  it('does not require a 160° hip angle to call anterior tilt', () => {
    const result = classifySidePelvicTilt(0.03, 172);
    expect(result.status).toBe('Anterior Tilt');
    expect(result.degrees).toBeGreaterThanOrEqual(5);
    expect(result.severity).not.toBe('Neutral');
  });

  it('stays neutral when the pelvis is stacked and the hip angle is ordinary', () => {
    expect(classifySidePelvicTilt(0.004, 172).status).toBe('Neutral');
  });

  it('still uses a very closed hip angle as a fallback', () => {
    expect(classifySidePelvicTilt(0, 150).status).toBe('Anterior Tilt');
  });
});
