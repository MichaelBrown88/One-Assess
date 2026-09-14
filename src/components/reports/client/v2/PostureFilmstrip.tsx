import React, { useState } from 'react';
import type { ClientReportPostureModel } from '@/lib/reports/buildClientReportModel';
import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import type { PostureFindingRecord, PostureFindingSeverity, PostureFindingViewId } from '@/lib/types/postureFindings';
import { isReportablePostureFinding } from '@/lib/posture/buildStructuredPostureFindings';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { PostureViewExpandedSheet } from '@/components/reports/posture/PostureViewExpandedSheet';
import { PostureMarkedImage } from '@/components/reports/posture/PostureMarkedImage';
import { sanitizeClientReportCopy } from '@/lib/reports/sanitizeClientReportCopy';
import { viewLabelTitle } from '@/lib/posture/aggregatePostureInsights';
import { useEnrichedPostureAnalysis } from '@/hooks/useReportPostureOverlay';
import { cn } from '@/lib/utils';

const VIEWS: PostureFindingViewId[] = ['front', 'side-left', 'back', 'side-right'];

const SEV_ORDER: Record<PostureFindingSeverity, number> = {
  aligned: 0,
  mild: 1,
  moderate: 2,
  significant: 3,
};

interface PostureFilmstripProps {
  posture: ClientReportPostureModel;
  embedded?: boolean;
}

function imageUrl(images: Record<string, string>, view: PostureFindingViewId): string {
  return (
    images[view] ||
    images[`postureImagesStorage_${view}`] ||
    images[`postureImagesFull_${view}`] ||
    ''
  );
}

function findingsForView(
  results: Partial<Record<PostureFindingViewId, PostureAnalysisResult>>,
  view: PostureFindingViewId,
): PostureFindingRecord[] {
  return (results[view]?.structuredFindings ?? []).filter(isReportablePostureFinding);
}

export function PostureFilmstrip({ posture, embedded = false }: PostureFilmstripProps) {
  const [expandedView, setExpandedView] = useState<PostureFindingViewId | null>(null);
  const overview = sanitizeClientReportCopy(posture.headline);

  return (
    <section className={cn(embedded ? '' : 'rounded-sm border border-border bg-card px-6 py-7 sm:px-10')}>
      <h2 className="text-base font-semibold tracking-[-0.02em] text-foreground">
        {CLIENT_REPORT_COPY.v2PostureHeading}
      </h2>

      <div className="mt-5 grid gap-x-8 gap-y-5 lg:grid-cols-2">
        {VIEWS.map((view) => (
          <PostureViewPair
            key={view}
            view={view}
            url={imageUrl(posture.images, view)}
            analysis={posture.postureResults[view]}
            findings={findingsForView(posture.postureResults, view)}
            onOpen={() => setExpandedView(view)}
          />
        ))}
      </div>

      {overview ? (
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-foreground-secondary">
          {overview}
        </p>
      ) : null}

      <PostureViewExpandedSheet
        view={expandedView}
        findings={expandedView ? findingsForView(posture.postureResults, expandedView) : []}
        imageUrl={expandedView ? imageUrl(posture.images, expandedView) : ''}
        analysis={expandedView ? posture.postureResults[expandedView] : undefined}
        onClose={() => setExpandedView(null)}
      />
    </section>
  );
}

interface PostureViewPairProps {
  view: PostureFindingViewId;
  url: string;
  analysis?: PostureAnalysisResult;
  findings: PostureFindingRecord[];
  onOpen: () => void;
}

function PostureViewPair({ view, url, analysis, findings, onOpen }: PostureViewPairProps) {
  const label = viewLabelTitle(view);
  const enriched = useEnrichedPostureAnalysis(url, view, analysis);
  const shown = [...(enriched?.structuredFindings ?? findings)]
    .filter(isReportablePostureFinding)
    .sort((a, b) => SEV_ORDER[b.severity] - SEV_ORDER[a.severity])
    .slice(0, 3);

  return (
    <article className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-4">
      {url ? (
        <button
          type="button"
          onClick={onOpen}
          className="overflow-hidden rounded-md border border-border/60 bg-white dark:bg-white"
        >
          <PostureMarkedImage url={url} view={view} analysis={analysis} className="w-full" />
        </button>
      ) : (
        <div className="flex h-36 items-end rounded-md border border-dashed border-border/80 bg-muted/30 p-2 sm:h-40">
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {CLIENT_REPORT_COPY.v2PostureViewMissing}
          </span>
        </div>
      )}
      <div className="min-w-0 pt-0.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        {shown.length === 0 ? (
          <p className="mt-1.5 text-[13px] leading-snug text-foreground-secondary">
            {url
              ? CLIENT_REPORT_COPY.v2PostureViewBalanced
              : CLIENT_REPORT_COPY.v2PostureViewMissing}
          </p>
        ) : (
          <ul className="mt-1.5 space-y-2">
            {shown.map((f) => {
              const cue = sanitizeClientReportCopy((f.whatWellDo || f.whatItMeans || '').trim());
              return (
                <li key={f.id}>
                  <p className="text-[13px] font-semibold text-foreground">{f.name}</p>
                  {cue ? (
                    <p className="mt-0.5 text-[12px] leading-snug text-foreground-secondary line-clamp-2">
                      {cue}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </article>
  );
}
