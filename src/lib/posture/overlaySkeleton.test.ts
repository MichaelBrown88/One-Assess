import { describe, expect, it } from 'vitest';
import { buildOverlaySkeleton, overlayFromNormalizedLandmarks } from './overlaySkeleton';

function blankPose() {
  return Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 1 }));
}

describe('buildOverlaySkeleton', () => {
  it('keeps ear and eye percents when the body is already on the report grid', () => {
    const raw = blankPose();
    raw[7] = { x: 0.48, y: 0.16, visibility: 1 };
    raw[3] = { x: 0.44, y: 0.145, visibility: 1 };
    raw[11] = { x: 0.5, y: 0.25, visibility: 1 };
    raw[12] = { x: 0.5, y: 0.25, visibility: 1 };
    raw[23] = { x: 0.5, y: 0.5, visibility: 1 };
    raw[24] = { x: 0.5, y: 0.5, visibility: 1 };
    raw[27] = { x: 0.5, y: 0.88, visibility: 1 };

    const overlay = buildOverlaySkeleton(raw, 'side-left', 800, 1200);

    expect(overlay?.ear?.x).toBeCloseTo(48, 0);
    expect(overlay?.ear?.y).toBeCloseTo(16, 0);
    expect(overlay?.eye?.x).toBeCloseTo(44, 0);
    expect(overlay?.eye?.y).toBeCloseTo(14.5, 0);
  });
});

describe('overlayFromNormalizedLandmarks', () => {
  it('uses MediaPipe x/y as overlay percents with no second alignment pass', () => {
    const raw = blankPose();
    raw[7] = { x: 0.47, y: 0.19, visibility: 1 };
    raw[3] = { x: 0.42, y: 0.17, visibility: 1 };
    raw[11] = { x: 0.51, y: 0.31, visibility: 1 };
    const overlay = overlayFromNormalizedLandmarks(raw, 'side-left');
    expect(overlay?.ear).toEqual({ x: 47, y: 19 });
    expect(overlay?.eye).toEqual({ x: 42, y: 17 });
    expect(overlay?.shoulder).toEqual({ x: 51, y: 31 });
  });

  it('uses the camera-facing ear when the named ear sits in front of the eye (cap visor)', () => {
    const raw = blankPose();
    raw[7] = { x: 0.40, y: 0.16, visibility: 0.9 };
    raw[3] = { x: 0.44, y: 0.18, visibility: 0.9 };
    raw[8] = { x: 0.48, y: 0.19, visibility: 0.85 };
    raw[6] = { x: 0.43, y: 0.175, visibility: 0.9 };
    raw[11] = { x: 0.51, y: 0.31, visibility: 1 };
    const overlay = overlayFromNormalizedLandmarks(raw, 'side-left');
    expect(overlay?.ear?.x).toBeCloseTo(48, 5);
    expect(overlay?.ear?.y).toBeCloseTo(19, 5);
    expect(overlay?.eye?.x).toBeCloseTo(43, 5);
    expect(overlay?.eye?.y).toBeCloseTo(17.5, 5);
  });
});
