import { describe, expect, it } from 'vitest';
import { resolveAlignmentSource } from './resolveAlignmentSource';

function lm(x: number, y: number) {
  return { x, y, z: 0, visibility: 1 };
}

describe('resolveAlignmentSource', () => {
  it('maps front hips and shoulders from raw landmarks', () => {
    const raw = Array.from({ length: 33 }, () => lm(0.5, 0.5));
    raw[11] = lm(0.4, 0.22);
    raw[12] = lm(0.6, 0.24);
    raw[23] = lm(0.42, 0.51);
    raw[24] = lm(0.58, 0.53);

    const source = resolveAlignmentSource('front', { raw }, 1000, 2000);
    expect(source).not.toBeNull();
    expect(source!.x).toBeCloseTo(500);
    expect(source!.shoulderY).toBeCloseTo(460);
    expect(source!.hipY).toBeCloseTo(1040);
  });

  it('returns null when torso height is too small to scale', () => {
    expect(
      resolveAlignmentSource(
        'front',
        { shoulder_y_percent: 40, hip_y_percent: 41, center_x_percent: 50 },
        800,
        1200,
      ),
    ).toBeNull();
  });

  it('uses midfoot percent on side views when ankles are missing', () => {
    const source = resolveAlignmentSource(
      'side-right',
      { shoulder_y_percent: 25, hip_y_percent: 50, midfoot_x_percent: 62 },
      800,
      1200,
    );
    expect(source).not.toBeNull();
    expect(source!.x).toBeCloseTo(496);
  });
});
