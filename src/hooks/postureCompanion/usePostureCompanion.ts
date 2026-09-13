import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/utils/logger';
import { VIEWS } from './types';
import type { UsePostureCompanionOptions, UsePostureCompanionResult } from './types';
import { usePostureCompanionSession } from './usePostureCompanionSession';
import { usePostureCompanionConnection } from './usePostureCompanionConnection';
import { usePostureCompanionUpload } from './usePostureCompanionUpload';
import { isPersistableImageUrl } from '@/lib/assessment/prepareFormDataForPersistence';
import { POSTURE_STUDIO_MODAL_COPY as COPY } from '@/constants/coachPostureCapture';
import { useToast } from '@/hooks/use-toast';

export function usePostureCompanion({
  isOpen,
  onComplete,
  onClose,
  onRequestDeviceCapture,
  autoApplyWhenReady = false,
}: UsePostureCompanionOptions): UsePostureCompanionResult {
  const { profile } = useAuth();
  const { toast } = useToast();

  const {
    session,
    setSession,
    error,
    companionUrl,
    placeholderImages,
    hasAllImages,
    isComplete,
  } = usePostureCompanionSession({ isOpen, profile });

  const { isOnline, connectionState } = usePostureCompanionConnection({
    isOpen,
    session,
    setSession,
  });

  const {
    isLoadingTestImages,
    processingStatus,
    previewImage,
    setPreviewImage,
    fileInputRef,
    handleLoadTestImages,
    handleFileUpload,
  } = usePostureCompanionUpload({ isOpen, session, profile });

  const autoAppliedRef = useRef(false);

  const handleApply = useCallback((): boolean => {
    if (!session) return false;

    const storageUrls: Record<string, string> = {};

    VIEWS.forEach((view) => {
      const storageUrl = session[`postureImagesStorage_${view}`] || session[`postureImagesFull_${view}`] || session.postureImages[view];
      if (isPersistableImageUrl(storageUrl)) {
        storageUrls[view] = storageUrl;
      } else {
        logger.warn(`[APPLY] No Storage URL found for ${view} - image may not be stored yet`);
      }
    });

    if (Object.keys(storageUrls).length < VIEWS.length) {
      toast({
        title: COPY.APPLY_FAILED_TITLE,
        description: COPY.APPLY_FAILED_BODY,
        variant: 'destructive',
      });
      return false;
    }

    const findings = {
      postureAiResults: session.analysis,
      postureImages: {},
      postureImagesStorage: storageUrls,
      postureHeadOverall:
        session.analysis['side-right']?.forward_head?.status === 'Neutral'
          ? ['neutral']
          : ['forward-head'],
      postureShouldersOverall:
        session.analysis.front?.shoulder_alignment?.status === 'Neutral' ? ['neutral'] : ['rounded'],
      postureBackOverall:
        session.analysis['side-right']?.kyphosis?.status !== 'Within range'
          ? ['increased-kyphosis']
          : ['neutral'],
    };

    onComplete(findings);
    onClose();
    return true;
  }, [session, onComplete, onClose, toast]);

  useEffect(() => {
    if (!isOpen) {
      autoAppliedRef.current = false;
      return;
    }
    if (!autoApplyWhenReady || autoAppliedRef.current || !hasAllImages) return;
    if (handleApply()) {
      autoAppliedRef.current = true;
    }
  }, [isOpen, autoApplyWhenReady, hasAllImages, handleApply]);

  const handleDirectScan = useCallback(() => {
    onRequestDeviceCapture?.();
  }, [onRequestDeviceCapture]);

  return {
    session,
    companionUrl,
    isOnline,
    connectionState,
    error,
    isLoadingTestImages,
    processingStatus,
    previewImage,
    setPreviewImage,
    fileInputRef,
    placeholderImages,
    hasAllImages,
    isComplete,
    views: VIEWS,
    handleLoadTestImages,
    handleFileUpload,
    handleApply,
    handleDirectScan,
  };
}
