import { describe, expect, it } from 'vitest';
import { planPostureOverlay } from './postureOverlayPlan';

describe('planPostureOverlay', () => {
  it('aligns and draws deviations when landmarks and analysis exist', () => {
    expect(
      planPostureOverlay({
        landmarks: { shoulder_y_percent: 22, hip_y_percent: 48, center_x_percent: 51 },
        analysis: { landmarks: { shoulder_y_percent: 22 } } as never,
      }),
    ).toEqual({ align: true, deviations: true });
  });

  it('does not stretch the photo when there are no landmarks', () => {
    expect(planPostureOverlay({ analysis: {} as never })).toEqual({
      align: false,
      deviations: true,
    });
  });
});
