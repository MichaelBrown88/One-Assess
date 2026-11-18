/**
 * Single-view coach-held posture capture: silent, no pose detection or voice.
 * Confirm runs a landmark quality gate, then returns the frame so the parent
 * can process in the background.
 */

import React, { useCallback, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Camera, Check, RotateCcw, X, Loader2 } from 'lucide-react';
import { PostureGuideOverlay } from './PostureGuideOverlay';
import { COACH_POSTURE_CAPTURE_COPY as COPY } from '@/constants/coachPostureCapture';
import { logger } from '@/lib/utils/logger';
import { captureVideoFrame } from '@/lib/camera/captureVideoFrame';
import { checkCoachStillQuality } from '@/lib/camera/checkCoachStillQuality';
import type { ViewType } from '@/hooks/postureCompanion/types';

const REAR_CAMERA = { facingMode: { ideal: 'environment' as const } };

interface CoachPostureCapturePanelProps {
  view: ViewType;
  onClose: () => void;
  /** Called with the JPEG data URL after the quality gate passes — do not await processing. */
  onShot: (imageDataUrl: string) => void;
}

export const CoachPostureCapturePanel: React.FC<CoachPostureCapturePanelProps> = ({
  view,
  onClose,
  onShot,
}) => {
  const webcamRef = useRef<Webcam>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [checkingQuality, setCheckingQuality] = useState(false);
  const [qualityError, setQualityError] = useState<string | null>(null);

  const viewLabel = COPY.VIEW_LABELS[view] ?? view;

  const handleShutter = useCallback(() => {
    const frame = captureVideoFrame(webcamRef.current?.video ?? null, 0.9);
    if (!frame) return;
    setQualityError(null);
    setCaptured(frame);
  }, []);

  const handleUsePhoto = useCallback(async () => {
    if (!captured || checkingQuality) return;
    setCheckingQuality(true);
    setQualityError(null);
    const result = await checkCoachStillQuality(captured, view);
    setCheckingQuality(false);
    if (!result.ok) {
      setQualityError(result.reason);
      setCaptured(null);
      return;
    }
    onShot(captured);
  }, [captured, checkingQuality, onShot, view]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <div>
          <p className="text-sm font-semibold">{COPY.SINGLE_VIEW_HEADER(viewLabel)}</p>
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
        {qualityError && (
          <div className="absolute inset-x-4 bottom-4 rounded-lg bg-amber-500/95 px-4 py-3 text-center text-sm font-medium text-amber-950">
            <p className="font-semibold">{COPY.QUALITY_GATE_FAIL_TITLE}</p>
            <p className="mt-1 text-xs leading-snug">{qualityError}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 px-4 py-5">
        {captured ? (
          <>
            <Button
              variant="outline"
              disabled={checkingQuality}
              onClick={() => {
                setCaptured(null);
                setQualityError(null);
              }}
              className="rounded-full border-white/30 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {COPY.RETAKE}
            </Button>
            <Button
              onClick={() => {
                void handleUsePhoto();
              }}
              disabled={checkingQuality}
              className="rounded-full px-8"
            >
              {checkingQuality ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              {checkingQuality ? COPY.USE_PHOTO_CHECKING : COPY.USE_PHOTO}
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
