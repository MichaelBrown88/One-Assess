import { CONFIG } from '@/config';
import type { AlignmentSource } from './resolveAlignmentSource';

export interface OverlayMap {
  scale: number;
  translateX: number;
  translateY: number;
  canvasW: number;
  canvasH: number;
}

export interface OverlayPt {
  x: number;
  y: number;
}

/**
 * Same scale/translate as drawAlignedImage — map original-image pixels onto
 * the 0–100 overlay used by the green grid and report SVG.
 */
export function createOverlayMap(
  source: AlignmentSource,
  canvasW: number,
  canvasH: number,
): OverlayMap | null {
  const targetCenterX = canvasW * (CONFIG.POSTURE_OVERLAY.TARGET_LANDMARKS.CENTER_X_PCT / 100);
  const targetShoulderY = canvasH * (CONFIG.POSTURE_OVERLAY.TARGET_LANDMARKS.SHOULDER_Y_PCT / 100);
  const targetHipY = canvasH * (CONFIG.POSTURE_OVERLAY.TARGET_LANDMARKS.HIP_Y_PCT / 100);
  const sourceTorsoHeight = Math.abs(source.hipY - source.shoulderY);
  const targetTorsoHeight = Math.abs(targetHipY - targetShoulderY);
  if (sourceTorsoHeight < 1) return null;

  const scale = Math.max(0.3, Math.min(3, targetTorsoHeight / sourceTorsoHeight));
  const translateX = targetCenterX - source.x * scale;
  const scaledBodyCenterY = ((source.shoulderY + source.hipY) / 2) * scale;
  const targetBodyCenterY = (targetShoulderY + targetHipY) / 2;
  const translateY = targetBodyCenterY - scaledBodyCenterY;

  return { scale, translateX, translateY, canvasW, canvasH };
}

export function mapPixelToOverlay(map: OverlayMap, px: number, py: number): OverlayPt {
  return {
    x: ((px * map.scale + map.translateX) / map.canvasW) * 100,
    y: ((py * map.scale + map.translateY) / map.canvasH) * 100,
  };
}

export function mapNormToOverlay(
  map: OverlayMap,
  pt: { x: number; y: number },
  imgW: number,
  imgH: number,
): OverlayPt {
  return mapPixelToOverlay(map, pt.x * imgW, pt.y * imgH);
}
