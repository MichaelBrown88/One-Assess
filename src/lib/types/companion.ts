/**
 * Types for Companion Modal Callbacks
 */

import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';

/**
 * Data structure returned by PostureCompanionModal.onComplete
 */
export interface PostureCompanionData {
  postureAiResults: Record<string, PostureAnalysisResult>;
  postureImages: Record<string, string>;
  postureImagesStorage: Record<string, string>;
  // Legacy fields for backward compatibility
  postureHeadOverall?: string[];
  postureShouldersOverall?: string[];
  postureBackOverall?: string[];
}


