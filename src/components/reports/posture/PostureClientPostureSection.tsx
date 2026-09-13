import React, { useState } from 'react';
import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import type { PostureFindingRecord, PostureFindingSeverity, PostureFindingViewId } from '@/lib/types/postureFindings';
import { cn } from '@/lib/utils';
import { PostureViewExpandedSheet } from './PostureViewExpandedSheet';
import { viewLabelUpper } from '@/lib/posture/aggregatePostureInsights';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';

const VIEWS: PostureFindingViewId[] = ['front', 'side-left', 'back', 'side-right'];

const SEV_ORDER: Record<PostureFindingSeverity, number> = {
  aligned: 0,
  mild: 1,
  moderate: 2,
  significant: 3,
};

function getImageUrl(postureImages: Record<string, string> | undefined, view: PostureFindingViewId): string {
  if (!postureImages) return '';
  return (
    postureImages[view] ||
    postureImages[`postureImagesStorage_${view}`] ||
    postureImages[`postureImagesFull_${view}`] ||
    ''
  );
}

function severityDotClass(sev: PostureFindingSeverity | undefined): string {
  if (sev === 'mild') return 'bg-score-amber';
  if (sev === 'moderate') return 'bg-orange-500';
  if (sev === 'significant') return 'bg-score-red';
  return 'bg-score-green';
}

interface PostureClientPostureSectionProps {
  postureResults: Partial<Record<PostureFindingViewId, PostureAnalysisResult>>;
  postureImages: Record<string, string>;
  /** Shorter tiles for the AXIS report filmstrip. */
  compact?: boolean;
}

/**
 * Compact posture row: always four view tiles so a missing right-side
 * (or any view) is obvious. Severity dot per captured view.
 */
export function PostureClientPostureSection({
  postureResults,
  postureImages,
  compact = false,
}: PostureClientPostureSectionProps) {
  const [expandedView, setExpandedView] = useState<PostureFindingViewId | null>(null);

  const hasAny = VIEWS.some((v) => getImageUrl(postureImages, v) || postureResults[v]);
  if (!hasAny) return null;

  const findingsByView: Partial<Record<PostureFindingViewId, PostureFindingRecord[]>> = {};
  for (const view of VIEWS) {
    const list = (postureResults[view]?.structuredFindings ?? []).filter((f) => f.severity !== 'aligned');
    findingsByView[view] = [...list].sort((a, b) => SEV_ORDER[b.severity] - SEV_ORDER[a.severity]);
  }

  return (
    <div>
      <div className={cn('grid grid-cols-4', compact ? 'gap-1.5' : 'gap-2')}>
        {VIEWS.map((view) => {
          const url = getImageUrl(postureImages, view);
          const findings = findingsByView[view] ?? [];
          const worstSeverity = findings[0]?.severity;
          const frameClass = compact ? 'h-36 w-full sm:h-44' : 'aspect-[3/5] w-full';
          if (!url) {
            return (
              <div
                key={view}
                className="relative overflow-hidden rounded-lg border border-dashed border-border/80 bg-muted/30"
              >
                <div className={cn('flex items-end bg-muted/20 p-1.5', frameClass)}>
                  <span className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                    {viewLabelUpper(view)}
                  </span>
                </div>
                <p className="sr-only">{CLIENT_REPORT_COPY.v2PostureViewMissing}</p>
              </div>
            );
          }
          return (
            <button
              key={view}
              type="button"
              onClick={() => setExpandedView(view)}
              className="group relative overflow-hidden rounded-lg border border-border/60 bg-white text-left dark:bg-white"
            >
              <div className={cn('overflow-hidden bg-white', frameClass)}>
                <img
                  src={url}
                  alt=""
                  className="h-full w-full object-contain object-center"
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white drop-shadow">
                  {viewLabelUpper(view)}
                </span>
                {postureResults[view] ? (
                  <span
                    className={cn('h-2 w-2 rounded-full ring-2 ring-black/40', severityDotClass(worstSeverity))}
                    aria-hidden
                  />
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      <PostureViewExpandedSheet
        view={expandedView}
        findings={expandedView ? findingsByView[expandedView] ?? [] : []}
        imageUrl={expandedView ? getImageUrl(postureImages, expandedView) : ''}
        onClose={() => setExpandedView(null)}
      />
    </div>
  );
}
