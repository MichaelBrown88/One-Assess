import type { FormData } from '@/contexts/FormContext';
import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';

const STRIPPED_PLACEHOLDER = '(base64_removed_for_storage_limit)';

export function isPersistableImageUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//.test(value);
}

export function pickPersistableImageMap(
  images: Record<string, string> | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!images || typeof images !== 'object') return out;
  for (const [key, value] of Object.entries(images)) {
    if (isPersistableImageUrl(value) && value !== STRIPPED_PLACEHOLDER) {
      out[key] = value;
    }
  }
  return out;
}

function stripRawLandmarks(
  results: FormData['postureAiResults'],
): FormData['postureAiResults'] {
  if (!results) return results;
  const out: Record<string, PostureAnalysisResult> = {};
  for (const [view, analysis] of Object.entries(results)) {
    if (!analysis) continue;
    const landmarks = analysis.landmarks;
    if (!landmarks?.raw) {
      out[view] = analysis;
      continue;
    }
    const { raw: _raw, ...keep } = landmarks;
    out[view] = { ...analysis, landmarks: keep };
  }
  return out;
}

/**
 * Assessment / public-report writes must never carry camera JPEGs as data URLs.
 * Four views blow past Firestore's 1MB document cap (and sessionStorage quota),
 * which is why in-studio posture looked applied then vanished on save.
 * Raw MediaPipe arrays are dropped too — overlays are already baked into Storage JPEGs.
 */
export function prepareFormDataForPersistence(formData: FormData): FormData {
  const fromImages = pickPersistableImageMap(formData.postureImages);
  const fromStorage = pickPersistableImageMap(formData.postureImagesStorage);
  return {
    ...formData,
    postureImages: {},
    postureImagesStorage: { ...fromImages, ...fromStorage },
    postureAiResults: stripRawLandmarks(formData.postureAiResults),
  };
}
