import type { LandmarkData, PostureView } from './types';

export interface AlignmentSource {
  x: number;
  shoulderY: number;
  hipY: number;
}

function avg(
  a: { x: number; y: number } | undefined,
  b: { x: number; y: number } | undefined,
  axis: 'x' | 'y',
): number | undefined {
  if (a && b) return (a[axis] + b[axis]) / 2;
  if (a) return a[axis];
  if (b) return b[axis];
  return undefined;
}

/**
 * Map MediaPipe / percent landmarks into source-image pixels so the body
 * can be scaled onto the report grid. Returns null when we cannot lock
 * shoulders, hips, and a midline — never fake 25%/50% defaults.
 */
export function resolveAlignmentSource(
  view: PostureView,
  landmarkData: LandmarkData | undefined,
  imgWidth: number,
  imgHeight: number,
): AlignmentSource | null {
  if (!landmarkData || imgWidth < 2 || imgHeight < 2) return null;

  const raw = landmarkData.raw;
  let shoulderY = avg(raw?.[11], raw?.[12], 'y');
  let hipY = avg(raw?.[23], raw?.[24], 'y');
  let x: number | undefined;

  if (view === 'side-left' || view === 'side-right') {
    const ankle = view === 'side-right' ? raw?.[28] : raw?.[27];
    x = ankle?.x;
    if (x == null && typeof landmarkData.midfoot_x_percent === 'number') {
      x = landmarkData.midfoot_x_percent / 100;
    }
  } else {
    x = avg(raw?.[23], raw?.[24], 'x');
    if (x == null && typeof landmarkData.center_x_percent === 'number') {
      x = landmarkData.center_x_percent / 100;
    }
  }

  if (shoulderY == null && typeof landmarkData.shoulder_y_percent === 'number') {
    shoulderY = landmarkData.shoulder_y_percent / 100;
  }
  if (hipY == null && typeof landmarkData.hip_y_percent === 'number') {
    hipY = landmarkData.hip_y_percent / 100;
  }

  if (x == null || shoulderY == null || hipY == null) return null;
  if (Math.abs(hipY - shoulderY) < 0.04) return null;

  return {
    x: x * imgWidth,
    shoulderY: shoulderY * imgHeight,
    hipY: hipY * imgHeight,
  };
}
