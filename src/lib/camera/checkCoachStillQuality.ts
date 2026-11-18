/**
 * Pre-confirm landmark quality gate for coach-held posture stills.
 * Failures stay in-panel (retake) — do not pass a bad frame to the parent.
 */

import {
  POSTURE_LANDMARK_QUALITY_COPY,
  postureLandmarkStructuralRetakeReason,
} from '@/constants/postureLandmarkQuality';
import { logger } from '@/lib/utils/logger';
import { evaluateCompanionStillCaptureLandmarks } from '@/services/postureProcessing';
import type { PostureStillCaptureViewId } from '@/services/postureProcessing';

export type CoachStillQualityResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function checkCoachStillQuality(
  imageDataUrl: string,
  view: PostureStillCaptureViewId,
): Promise<CoachStillQualityResult> {
  try {
    const gate = await evaluateCompanionStillCaptureLandmarks(imageDataUrl, view);
    if (!gate.ok) {
      logger.warn(
        `[COACH_POSTURE] Quality gate rejected ${view} (avg ${gate.avgVisibility.toFixed(2)}, min ${gate.minAnchorVisibility.toFixed(2)})`,
      );
      return { ok: false, reason: postureLandmarkStructuralRetakeReason(gate.failingRegions) };
    }
    return { ok: true };
  } catch (err) {
    logger.warn('[COACH_POSTURE] Landmark quality gate failed', err);
    return { ok: false, reason: POSTURE_LANDMARK_QUALITY_COPY.GENERIC_LOW_CONFIDENCE };
  }
}
