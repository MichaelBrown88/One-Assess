/**
 * PostureCompanionModal
 *
 * Studio posture capture: tap each of the four views to shoot on this device,
 * or upload photos. Alignment uses the same processPostureImage path as manual
 * upload and runs in the background so the coach can shoot the next view immediately.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePostureCompanion } from '@/hooks/usePostureCompanion';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CoachPostureCapturePanel } from '@/components/camera/CoachPostureCapturePanel';
import { PostureStudioViewGrid } from '@/components/camera/PostureStudioViewGrid';
import { POSTURE_STUDIO_MODAL_COPY as COPY } from '@/constants/coachPostureCapture';
import type { PostureCompanionData } from '@/lib/types/companion';
import type { ViewType } from '@/hooks/postureCompanion/types';
import { ArrowRight, Camera, ImagePlus, Loader2, X } from 'lucide-react';

interface PostureCompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: PostureCompanionData) => void;
}

export const PostureCompanionModal: React.FC<PostureCompanionModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [captureView, setCaptureView] = useState<ViewType | null>(null);

  const {
    session,
    isLoadingTestImages,
    processingStatus,
    previewImage,
    setPreviewImage,
    pendingPreviews,
    fileInputRef,
    placeholderImages,
    hasAllImages,
    isComplete,
    uploadsInFlight,
    views,
    handleLoadTestImages,
    handleFileUpload,
    queueDeviceCapture,
    handleApply,
  } = usePostureCompanion({
    isOpen,
    onComplete,
    onClose,
    autoApplyWhenReady: true,
  });

  const sessionReady = Boolean(session?.id && profile?.organizationId);
  const canApply = hasAllImages && isComplete && !uploadsInFlight;

  const nextEmptyView = useMemo(
    () =>
      views.find((view) => {
        const status = processingStatus[view];
        const hasSessionImage = Boolean(session?.postureImages[view]);
        const hasPending = Boolean(pendingPreviews[view]);
        return status === 'idle' && !hasSessionImage && !hasPending;
      }) ?? null,
    [views, processingStatus, session?.postureImages, pendingPreviews],
  );

  const requestClose = useCallback(() => {
    if (uploadsInFlight) {
      toast({
        title: COPY.CLOSE_UPLOADS_TITLE,
        description: COPY.CLOSE_UPLOADS_BODY,
        variant: 'destructive',
      });
      return;
    }
    onClose();
  }, [uploadsInFlight, toast, onClose]);

  const openCapture = useCallback(
    (view: ViewType) => {
      if (!sessionReady) return;
      setCaptureView(view);
    },
    [sessionReady],
  );

  const handleShot = useCallback(
    (imageDataUrl: string) => {
      if (!captureView) return;
      const view = captureView;
      setCaptureView(null);
      queueDeviceCapture(view, imageDataUrl);
    },
    [captureView, queueDeviceCapture],
  );

  return (
    <>
      <Dialog
        open={isOpen && !captureView}
        onOpenChange={(open) => {
          if (!open) requestClose();
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl p-0 border-none bg-background">
          <DialogHeader className="sr-only">
            <DialogTitle>{COPY.TITLE}</DialogTitle>
            <DialogDescription>{COPY.SUBTITLE}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col lg:flex-row h-full">
            <div className="w-full lg:w-1/3 bg-muted/50 p-8 border-r border-border flex flex-col">
              <div className="mb-8">
                <div className="bg-background p-4 rounded-3xl shadow-sm mb-4 inline-flex">
                  <Camera className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">{COPY.TITLE}</h3>
                <p className="text-muted-foreground text-xs mt-2">{COPY.SUBTITLE}</p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => openCapture(nextEmptyView ?? views[0]!)}
                  disabled={!sessionReady}
                  className="w-full h-12"
                >
                  {sessionReady ? (
                    <Camera className="h-4 w-4 mr-2" />
                  ) : (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {COPY.OPTION_CAPTURE}
                </Button>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {COPY.OPTION_CAPTURE_HINT}
                </p>

                <input
                  ref={fileInputRef as React.RefObject<HTMLInputElement | null>}
                  type="file"
                  accept="image/*,.heic,.heif"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  onClick={handleLoadTestImages}
                  disabled={isLoadingTestImages || !session?.id}
                  variant="ghost"
                  className="w-full text-muted-foreground"
                >
                  {isLoadingTestImages ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <ImagePlus className="h-4 w-4 mr-2" />
                      {COPY.OPTION_UPLOAD}
                    </>
                  )}
                </Button>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {COPY.UPLOAD_HEIC_NOTE}
                </p>
              </div>
            </div>

            <div className="flex-1 p-8 overflow-y-auto bg-background max-h-[90vh] relative">
              <p className="mb-4 text-xs text-muted-foreground">{COPY.GRID_HINT}</p>

              <PostureStudioViewGrid
                views={views}
                session={session}
                pendingPreviews={pendingPreviews}
                processingStatus={processingStatus}
                placeholderImages={placeholderImages}
                sessionReady={sessionReady}
                onOpenCapture={openCapture}
                onPreview={(url, view) => setPreviewImage({ url, view })}
              />

              {hasAllImages && (
                <div className="absolute bottom-0 left-0 right-0 p-8 bg-background/80 backdrop-blur-md border-t border-border z-50">
                  <Button
                    onClick={() => {
                      void handleApply();
                    }}
                    disabled={!canApply}
                    className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs gap-3 shadow-lg shadow-emerald-500/20 disabled:opacity-60"
                  >
                    {!canApply && <Loader2 className="h-4 w-4 animate-spin" />}
                    {canApply ? COPY.APPLY : COPY.APPLY_WAITING}
                    {canApply && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {captureView && session?.id && profile?.organizationId &&
        createPortal(
          <CoachPostureCapturePanel
            view={captureView}
            onClose={() => setCaptureView(null)}
            onShot={handleShot}
          />,
          document.body,
        )}

      {previewImage && (
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0 border-none bg-black/95">
            <DialogHeader className="sr-only">
              <DialogTitle>Posture Image Preview</DialogTitle>
            </DialogHeader>
            <div className="relative w-full h-full flex items-center justify-center p-8">
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 z-50 text-white hover:text-gray-300 p-2"
              >
                <X className="h-6 w-6" />
              </button>
              <img
                src={previewImage.url}
                alt={previewImage.view}
                className="max-w-full max-h-[85vh] object-contain"
              />
              <div className="absolute bottom-4 left-4 right-4 flex flex-col items-center gap-2 text-center">
                <p className="text-white text-sm font-bold">
                  {previewImage.view.replace('-', ' ')} View
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  onClick={() => {
                    const view = previewImage.view as ViewType;
                    setPreviewImage(null);
                    openCapture(view);
                  }}
                >
                  Retake
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
