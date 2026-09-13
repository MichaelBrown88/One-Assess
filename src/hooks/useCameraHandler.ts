/**
 * Hook for managing camera and companion modal state
 * Extracted from MultiStepForm to improve performance and separation of concerns
 */

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { processBodyCompScan } from '@/lib/ai/ocrEngine';
import { classifyOcrFailure, type OcrFailReason } from '@/lib/ai/ocrFailure';
import { BODY_COMP_OCR_COPY as OCR_COPY } from '@/constants/bodyCompOcrCopy';
import type { FormData } from '@/contexts/FormContext';
import type { PostureCompanionData } from '@/lib/types/companion';
import { logger } from '@/lib/utils/logger';

interface UseCameraHandlerProps {
  updateFormData: (updates: Partial<FormData>) => void;
  organizationId?: string;
  persistPosture?: (data: PostureCompanionData) => Promise<void>;
}

export function useCameraHandler({
  updateFormData,
  organizationId,
  persistPosture,
}: UseCameraHandlerProps) {
  const { toast } = useToast();
  // Camera state
  const [showCamera, setShowCamera] = useState<false | 'ocr'>(false);
  const [showPostureCompanion, setShowPostureCompanion] = useState(false);
  const [ocrReviewData, setOcrReviewData] = useState<Partial<FormData> | null>(null);
  const [ocrFailReason, setOcrFailReason] = useState<OcrFailReason | null>(null);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [processingMode, setProcessingMode] = useState<'ocr' | 'posture' | null>(null);
  const [postureRetakeWarning, setPostureRetakeWarning] = useState<string | null>(null);
  const clearPostureRetakeWarning = useCallback(() => setPostureRetakeWarning(null), []);

  const handleCapture = useCallback(async (imageSrc: string) => {
    if (showCamera === 'ocr') {
      setShowCamera(false);
      setProcessingMode('ocr');
      setIsProcessingOcr(true);

      toast({
        title: OCR_COPY.CAPTURED_TITLE,
        description: OCR_COPY.CAPTURED_BODY,
      });

      try {
        const result = await processBodyCompScan(imageSrc, organizationId);
        if (result.fields && Object.keys(result.fields).length > 0) {
          setOcrReviewData(result.fields);
        } else {
          setOcrFailReason('unreadable');
        }
      } catch (err) {
        logger.error('OCR error:', err);
        const reason = classifyOcrFailure(err);
        if (reason === 'unreadable') {
          setOcrFailReason('unreadable');
        } else {
          toast({
            title: reason === 'credit' ? OCR_COPY.CREDIT_TITLE : OCR_COPY.DISABLED_TITLE,
            description: err instanceof Error ? err.message : OCR_COPY.UNREADABLE_BODY,
            variant: 'destructive',
          });
        }
      } finally {
        setIsProcessingOcr(false);
        setProcessingMode(null);
      }
    }
  }, [showCamera, organizationId, toast]);

  // Apply reviewed values and stay on the current step — the coach confirms
  // any remaining fields and advances manually (no auto phase jump).
  const applyOcrData = useCallback(() => {
    if (ocrReviewData) {
      // Set flag to show analyzer fields after OCR data is applied
      updateFormData({ ...ocrReviewData, showAnalyzerFields: 'yes' });
      setOcrReviewData(null);
      toast({ title: OCR_COPY.APPLIED_TITLE, description: OCR_COPY.APPLIED_BODY });
    }
  }, [ocrReviewData, updateFormData, toast]);

  const dismissOcrFail = useCallback(() => setOcrFailReason(null), []);

  const retryOcrCapture = useCallback(() => {
    setOcrFailReason(null);
    setShowCamera('ocr');
  }, []);

  const handlePostureCompanionComplete = useCallback((data: PostureCompanionData) => {
    updateFormData(data);
    toast({ title: "Posture data applied", description: "Analysis has been populated." });
    if (persistPosture) {
      void persistPosture(data).catch((err) => {
        logger.warn('[useCameraHandler] Failed to persist posture onto the saved report', err);
      });
    }
  }, [updateFormData, toast, persistPosture]);

  return {
    // State
    showCamera,
    setShowCamera,
    showPostureCompanion,
    setShowPostureCompanion,
    ocrReviewData,
    setOcrReviewData,
    ocrFailReason,
    dismissOcrFail,
    retryOcrCapture,
    isProcessingOcr,
    processingMode,
    postureRetakeWarning,
    clearPostureRetakeWarning,
    // Handlers
    handleCapture,
    applyOcrData,
    handlePostureCompanionComplete,
  };
}
