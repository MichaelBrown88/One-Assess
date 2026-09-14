import { useEffect, useMemo, useState } from 'react';
import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import type { PostureFindingViewId } from '@/lib/types/postureFindings';
import { enrichPostureAnalysisFromOverlay } from '@/lib/posture/overlayCues';
import type { OverlaySkeleton } from '@/lib/posture/overlaySkeleton';
import { logger } from '@/lib/utils/logger';

const cache = new Map<string, OverlaySkeleton>();
const inflight = new Map<string, Promise<OverlaySkeleton | undefined>>();

function cacheKey(url: string, view: string): string {
  return `${view}::${url}`;
}

export function overlayHasPose(overlay: OverlaySkeleton | undefined): boolean {
  if (!overlay) return false;
  return Boolean((overlay.ear && overlay.eye) || overlay.hip || overlay.shoulder);
}

/**
 * Report photos are already grid-aligned and older scans stripped raw landmarks.
 * Detect pose on the JPEG you see and map 0–1 MediaPipe coords straight into overlay %.
 */
export function useReportPostureOverlay(
  url: string,
  view: PostureFindingViewId,
  stored: OverlaySkeleton | undefined,
): OverlaySkeleton | undefined {
  const storedOk = overlayHasPose(stored);
  const [detected, setDetected] = useState<OverlaySkeleton | undefined>(
    () => (storedOk ? stored : cache.get(cacheKey(url, view))),
  );

  useEffect(() => {
    if (!url || storedOk) return;
    const key = cacheKey(url, view);
    const cached = cache.get(key);
    if (cached) {
      setDetected(cached);
      return;
    }

    let cancelled = false;

    const run = async () => {
      let pending = inflight.get(key);
      if (!pending) {
        pending = detectDisplayOverlay(url, view).finally(() => {
          inflight.delete(key);
        });
        inflight.set(key, pending);
      }
      const result = await pending;
      if (cancelled || !result) return;
      cache.set(key, result);
      setDetected(result);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [url, view, storedOk]);

  return storedOk ? stored : detected;
}

export function useEnrichedPostureAnalysis(
  url: string,
  view: PostureFindingViewId,
  analysis: PostureAnalysisResult | undefined,
): PostureAnalysisResult | undefined {
  const overlay = useReportPostureOverlay(url, view, analysis?.landmarks?.overlay);
  return useMemo(
    () => enrichPostureAnalysisFromOverlay(view, analysis, overlay),
    [view, analysis, overlay],
  );
}

async function detectDisplayOverlay(
  url: string,
  view: PostureFindingViewId,
): Promise<OverlaySkeleton | undefined> {
  try {
    const { detectPostureLandmarks } = await import('@/lib/ai/postureLandmarks');
    const { overlayFromNormalizedLandmarks } = await import('@/lib/posture/overlaySkeleton');
    const result = await detectPostureLandmarks(url, view);
    // Ignore result.overlay — that path assumes an unaligned capture photo.
    return overlayFromNormalizedLandmarks(result.raw, view);
  } catch (error) {
    logger.warn('Report overlay pose detect failed', 'POSTURE_OVERLAY', { view, error });
    return undefined;
  }
}
