import { CONFIG } from '@/config';
import type { LandmarkResult } from '@/lib/ai/postureLandmarks';
import { addPostureOverlay } from './postureOverlayCanvas';
import type { PostureView } from './types';

/**
 * Client AXIS report posture image: aligned figure on white with green
 * reference lines. Deviation marks are drawn at display time from pose points.
 */
export async function composeClientPosturePreview(
  imageData: string,
  view: PostureView,
  landmarks: LandmarkResult,
): Promise<string> {
  const style = CONFIG.POSTURE_OVERLAY.STYLE;

  return addPostureOverlay(imageData, view, {
    mode: 'align',
    landmarks: {
      shoulder_y_percent: landmarks.shoulder_y_percent,
      hip_y_percent: landmarks.hip_y_percent,
      head_y_percent: landmarks.head_y_percent,
      center_x_percent: landmarks.center_x_percent,
      midfoot_x_percent: landmarks.midfoot_x_percent,
      overlay: landmarks.overlay,
      raw: landmarks.raw,
    },
    backgroundColor: style.CLIENT_BG,
    lineColor: style.CLIENT_LINE_COLOR,
    lineWidth: style.CLIENT_LINE_WIDTH,
  });
}
