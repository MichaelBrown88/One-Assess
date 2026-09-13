import type { OverlayOptions } from './types';

export function planPostureOverlay(
  options: Pick<OverlayOptions, 'landmarks' | 'analysis'>,
): { align: boolean; deviations: boolean } {
  const landmarkData = options.landmarks || options.analysis?.landmarks;
  const align = Boolean(
    landmarkData &&
      (typeof landmarkData.shoulder_y_percent === 'number' ||
        (Array.isArray(landmarkData.raw) && landmarkData.raw.length > 0)),
  );
  return {
    align,
    deviations: Boolean(options.analysis),
  };
}
