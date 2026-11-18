/**
 * Four-view posture status grid for the studio capture modal.
 */

import React from 'react';
import { AlertCircle, Camera, CheckCircle2, Loader2 } from 'lucide-react';
import {
  COACH_POSTURE_CAPTURE_COPY,
  POSTURE_STUDIO_MODAL_COPY as COPY,
} from '@/constants/coachPostureCapture';
import type { LiveSession } from '@/services/liveSessions';
import type { ProcessingStatus, ViewType } from '@/hooks/postureCompanion/types';

interface PostureStudioViewGridProps {
  views: readonly ViewType[];
  session: LiveSession | null;
  pendingPreviews: Partial<Record<ViewType, string>>;
  processingStatus: ProcessingStatus;
  placeholderImages: Record<string, string>;
  sessionReady: boolean;
  onOpenCapture: (view: ViewType) => void;
  onPreview: (url: string, view: ViewType) => void;
}

function statusLabel(stage: string): string {
  switch (stage) {
    case 'converting':
      return 'Converting image...';
    case 'detecting':
      return 'Detecting pose...';
    case 'wireframe':
      return 'Analyzing posture...';
    case 'aligning':
      return 'Processing...';
    case 'analyzing':
      return 'Generating insights...';
    case 'complete':
      return 'Complete';
    case 'error':
      return 'Error';
    default:
      return '';
  }
}

function isWireframeButAnalyzing(status: string): boolean {
  return status === 'detecting' || status === 'analyzing' || status === 'aligning';
}

export const PostureStudioViewGrid: React.FC<PostureStudioViewGridProps> = ({
  views,
  session,
  pendingPreviews,
  processingStatus,
  placeholderImages,
  sessionReady,
  onOpenCapture,
  onPreview,
}) => (
  <div className="grid grid-cols-2 gap-4 pb-20">
    {views.map((view) => {
      const imageUrl = session?.postureImages[view] || pendingPreviews[view] || null;
      const status = processingStatus[view];
      const isProcessing = status !== 'idle' && status !== 'complete' && status !== 'error';
      const label = COACH_POSTURE_CAPTURE_COPY.VIEW_LABELS[view] ?? view;
      const labelText = statusLabel(status);

      return (
        <div key={view} className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
              {label}
            </span>
            {status === 'complete' && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
            {status === 'error' && <AlertCircle className="h-3 w-3 text-red-500" />}
          </div>
          <button
            type="button"
            disabled={!sessionReady}
            aria-label={COPY.GRID_TAP_ARIA(label)}
            onClick={() => {
              if (imageUrl && status === 'complete') {
                onPreview(imageUrl, view);
                return;
              }
              onOpenCapture(view);
            }}
            className="aspect-[3/4] rounded-2xl bg-muted/50 border-2 border-dashed border-border overflow-hidden relative flex items-center justify-center text-left disabled:opacity-60"
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                className="w-full h-full object-contain bg-background"
                alt={label}
              />
            ) : (
              <>
                <img
                  src={placeholderImages[view]}
                  className="w-full h-full object-cover opacity-40"
                  alt=""
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <Camera className="h-6 w-6 text-foreground" />
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground">
                    {COPY.GRID_TAP_HINT}
                  </span>
                </div>
              </>
            )}

            {isProcessing && !isWireframeButAnalyzing(status) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white">
                  {labelText}
                </span>
              </div>
            )}

            {isWireframeButAnalyzing(status) && (
              <div className="absolute bottom-2 left-2 right-2">
                <div className="flex items-center justify-center gap-1.5 bg-black/60 backdrop-blur-sm text-white/90 text-[10px] font-medium py-1.5 px-3 rounded-full">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>{labelText}</span>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="absolute inset-x-2 bottom-2 rounded-full bg-destructive/90 px-3 py-1.5 text-center text-[10px] font-semibold text-destructive-foreground">
                Tap to retake
              </div>
            )}
          </button>

          {session?.analysis[view]?.overall_assessment && (
            <div className="mt-2 bg-muted/50 p-2 rounded-lg border border-border">
              <p className="text-[10px] text-foreground-secondary leading-snug whitespace-normal break-words">
                {session.analysis[view].overall_assessment}
              </p>
            </div>
          )}
        </div>
      );
    })}
  </div>
);
