import React, { useState } from 'react';
import type { PostureFindingRecord, PostureFindingViewId } from '@/lib/types/postureFindings';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { PostureMarkedImage } from './PostureMarkedImage';
import { PostureFindingDetail } from './PostureFindingDetail';
import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';

const VIEW_DISPLAY = CLIENT_REPORT_COPY.v2PostureViewTitle;

interface PostureViewExpandedSheetProps {
  view: PostureFindingViewId | null;
  /** Reportable findings for this view, worst first, with current copy. */
  findings: PostureFindingRecord[];
  imageUrl: string;
  analysis?: PostureAnalysisResult;
  onClose: () => void;
}

export function PostureViewExpandedSheet({
  view,
  findings,
  imageUrl,
  analysis,
  onClose,
}: PostureViewExpandedSheetProps) {
  const open = view !== null;
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const selectedFinding = findings.find(f => f.id === selectedFindingId) ?? findings[0];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent hideCloseButton aria-describedby={undefined} className="!fixed !inset-0 !h-full !w-full !max-w-none !max-h-none !translate-x-0 !translate-y-0 !transform-none !animate-none !rounded-none border-0 bg-background p-0 gap-0 flex flex-col overflow-y-auto md:flex-row md:overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{view ? VIEW_DISPLAY[view] : CLIENT_REPORT_COPY.v2PostureHeading}</DialogTitle>
        </DialogHeader>
        {view && (
          <>
            <button
              type="button"
              className="fixed right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-50 flex h-10 items-center justify-center gap-1 rounded-full border border-border bg-background px-3 text-sm font-medium text-foreground shadow-sm"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
              Close
            </button>

            <div className="order-2 md:order-1 flex shrink-0 flex-col px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:flex-1 md:overflow-y-auto md:max-w-[55%] md:p-8 md:pt-10">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                {CLIENT_REPORT_COPY.v2PostureHeading}
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{VIEW_DISPLAY[view]}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {findings.length === 0
                  ? analysis ? CLIENT_REPORT_COPY.v2PostureViewBalanced : CLIENT_REPORT_COPY.v2PostureUnanalysed
                  : CLIENT_REPORT_COPY.v2PostureViewCount(findings.length)}
              </p>

              {findings.length > 1 ? (
                <div className="mt-5">
                  <p className="text-xs font-medium text-muted-foreground">{CLIENT_REPORT_COPY.v2PostureChooseFinding}</p>
                  <div className="mt-2 flex flex-wrap gap-2" aria-label={CLIENT_REPORT_COPY.v2PostureChooseFinding}>
                    {findings.map(f => (
                      <button key={f.id} type="button" aria-pressed={selectedFinding?.id === f.id}
                        onClick={() => setSelectedFindingId(f.id)}
                        className={`rounded-full border px-3 py-2 text-sm ${selectedFinding?.id === f.id ? 'border-foreground bg-foreground text-background' : 'border-border bg-background text-foreground'}`}>
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {selectedFinding ? (
                <div className="mt-5 border-t border-border pt-5">
                  <PostureFindingDetail finding={selectedFinding} />
                </div>
              ) : null}
            </div>

            <div className="order-1 md:order-2 flex h-[34vh] min-h-48 w-full shrink-0 items-center justify-center overflow-hidden bg-white md:h-full md:w-auto md:flex-1">
              {imageUrl ? (
                <PostureMarkedImage
                  url={imageUrl}
                  view={view}
                  analysis={analysis}
                  className="max-h-full w-auto max-w-full"
                  imageClassName="max-h-[34vh] md:max-h-dvh"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  {CLIENT_REPORT_COPY.v2PostureViewMissing}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
