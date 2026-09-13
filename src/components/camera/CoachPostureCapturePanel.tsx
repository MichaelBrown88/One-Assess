/**
 * Minimal coach-held posture capture: silent, no pose detection or voice.
 * Confirmed shots wait for Storage upload, then attach to the assessment.
 */

import React, { useCallback, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Camera, Check, RotateCcw, X, Loader2 } from 'lucide-react';
import { updatePostureImage } from '@/services/liveSessions';
import { VIEWS, type ViewType } from '@/hooks/postureCompanion/types';
import { PostureGuideOverlay } from './PostureGuideOverlay';
import { COACH_POSTURE_CAPTURE_COPY as COPY } from '@/constants/coachPostureCapture';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/utils/logger';
import { captureVideoFrame } from '@/lib/camera/captureVideoFrame';
import type { UserProfile } from '@/types/auth';
import type { PostureCompanionData } from '@/lib/types/companion';
import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';

const REAR_CAMERA = { facingMode: { ideal: 'environment' as const } };

interface CoachPostureCapturePanelProps {
  sessionId: string;
  organizationId: string;
  profile: UserProfile;
  onClose: () => void;
  onCommitted: (data: PostureCompanionData) => void;
}

export const CoachPostureCapturePanel: React.FC<CoachPostureCapturePanelProps> = ({
  sessionId,
  organizationId,
  profile,
  onClose,
  onCommitted,
}) => {
  const webcamRef = useRef<Webcam>(null);
  const committedRef = useRef<Partial<Record<ViewType, { url: string; analysis: PostureAnalysisResult }>>>({});
  const [viewIdx, setViewIdx] = useState(0);
  const [captured, setCaptured] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const view = VIEWS[viewIdx];
  const viewLabel = COPY.VIEW_LABELS[view] ?? view;

  const handleShutter = useCallback(() => {
    const frame = captureVideoFrame(webcamRef.current?.video ?? null, 0.9);
    if (!frame) return;
    setCaptured(frame);
  }, []);

  const handleUsePhoto = useCallback(async () => {
    if (!captured || saving) return;
    setSaving(true);
    try {
      const result = await updatePostureImage(
        sessionId,
        view,
        captured,
        undefined,
        'this-device',
        organizationId,
        profile,
      );
      committedRef.current[view] = { url: result.storageUrl, analysis: result.analysis };

      if (viewIdx >= VIEWS.length - 1) {
        const images: Record<string, string> = {};
        const analysis: Record<string, PostureAnalysisResult> = {};
        VIEWS.forEach((id) => {
          const item = committedRef.current[id];
          if (item) {
            images[id] = item.url;
            analysis[id] = item.analysis;
          }
        });
        onCommitted({
          postureAiResults: analysis,
          postureImages: {},
          postureImagesStorage: images,
        });
        return;
      }

      setCaptured(null);
      setViewIdx((i) => i + 1);
    } catch (err) {
      logger.error('[COACH_POSTURE] Upload failed', 'PostureCapture', err);
      toast({
        title: COPY.UPLOAD_FAILED_TITLE,
        description: COPY.UPLOAD_FAILED_BODY,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [captured, saving, sessionId, view, organizationId, profile, viewIdx, onCommitted, toast]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <div>
          <p className="text-sm font-semibold">
            {COPY.VIEW_HEADER(viewIdx + 1, VIEWS.length, viewLabel)}
          </p>
          {!captured && (
            <p className="mt-0.5 max-w-md text-xs text-white/70">{COPY.VIEW_HINTS[view]}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 hover:text-white"
          onClick={onClose}
          aria-label={COPY.CLOSE_ARIA}
          disabled={saving}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {captured ? (
          <img src={captured} alt={viewLabel} className="h-full w-full object-contain" />
        ) : cameraError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-white">
            <p className="text-sm font-semibold">{COPY.CAMERA_ERROR_TITLE}</p>
            <p className="max-w-sm text-sm text-white/70">{COPY.CAMERA_ERROR_BODY}</p>
            <Button
              variant="outline"
              onClick={() => {
                setCameraError(false);
                setCameraReady(false);
                setCameraAttempt((n) => n + 1);
              }}
              className="mt-2 rounded-full border-white/30 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {COPY.CAMERA_RETRY}
            </Button>
          </div>
        ) : (
          <>
            <Webcam
              key={cameraAttempt}
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={REAR_CAMERA}
              onUserMedia={() => setCameraReady(true)}
              onUserMediaError={(err) => {
                logger.error('[COACH_POSTURE] Camera failed to start', 'PostureCapture', err);
                setCameraError(true);
              }}
              className="h-full w-full object-contain"
            />
            {cameraReady ? (
              <PostureGuideOverlay />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center gap-2 text-white/70">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">{COPY.CAMERA_STARTING}</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 px-4 py-5">
        {captured ? (
          <>
            <Button
              variant="outline"
              onClick={() => setCaptured(null)}
              disabled={saving}
              className="rounded-full border-white/30 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {COPY.RETAKE}
            </Button>
            <Button onClick={() => void handleUsePhoto()} disabled={saving} className="rounded-full px-8">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              {saving ? COPY.SAVING : COPY.USE_PHOTO}
            </Button>
          </>
        ) : cameraError ? null : (
          <button
            type="button"
            onClick={handleShutter}
            disabled={!cameraReady}
            aria-label={COPY.SHUTTER_ARIA}
            className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/80 bg-white/20 transition-colors hover:bg-white/30 disabled:opacity-40"
          >
            <Camera className="h-7 w-7 text-white" />
          </button>
        )}
      </div>
    </div>
  );
};
