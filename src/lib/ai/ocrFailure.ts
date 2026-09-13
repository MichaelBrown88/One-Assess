/**
 * Classify body-comp OCR failures so the gym-floor UI can offer
 * Retake / Enter manually for unreadable photos, and distinct copy
 * for credit or kill-switch blocks.
 */

export type OcrFailReason = 'unreadable' | 'credit' | 'disabled';

export function classifyOcrFailure(err: unknown): OcrFailReason {
  if (err instanceof Error && err.name === 'AICreditExhaustedError') return 'credit';
  if (err instanceof Error && err.name === 'FeatureDisabledError') return 'disabled';
  return 'unreadable';
}
