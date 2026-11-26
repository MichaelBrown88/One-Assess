import React, { useMemo, useState } from 'react';
import type { ClientReportPostureModel } from '@/lib/reports/buildClientReportModel';
import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import type { PostureFindingRecord, PostureFindingSeverity, PostureFindingViewId } from '@/lib/types/postureFindings';
import {
  isReportablePostureFinding,
  withCurrentPostureCopy,
} from '@/lib/posture/buildStructuredPostureFindings';
import { buildPostureOverview, reportablePostureFindings } from '@/lib/posture/postureOverview';
import { getPostureFeedbackDefinition } from '@/constants/postureFeedbackLibrary';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { PostureViewExpandedSheet } from '@/components/reports/posture/PostureViewExpandedSheet';
import { PostureMarkedImage } from '@/components/reports/posture/PostureMarkedImage';
import { sanitizeClientReportCopy } from '@/lib/reports/sanitizeClientReportCopy';
import { useEnrichedPostureAnalysis } from '@/hooks/useReportPostureOverlay';
import { cn } from '@/lib/utils';

const VIEWS: PostureFindingViewId[] = ['front', 'side-left', 'back', 'side-right'];
const MAX_CARD_FINDINGS = 3;

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

function viewFindings(analysis: PostureAnalysisResult | undefined): PostureFindingRecord[] {
  return (analysis?.structuredFindings ?? [])
    .filter(isReportablePostureFinding)
    .map(withCurrentPostureCopy)
    .sort((a, b) => SEV_ORDER[b.severity] - SEV_ORDER[a.severity]);
}

function findingImpact(f: PostureFindingRecord): string {
  return getPostureFeedbackDefinition(f.id)?.impact ?? f.whatItMeans ?? '';
}

/** Re-checks each photo once so the cards, the summary and the detail sheet all agree. */
function useEnrichedPostureResults(
  posture: ClientReportPostureModel,
): Partial<Record<PostureFindingViewId, PostureAnalysisResult>> {
  const { images, postureResults } = posture;
  const front = useEnrichedPostureAnalysis(imageUrl(images, 'front'), 'front', postureResults.front);
  const sideLeft = useEnrichedPostureAnalysis(imageUrl(images, 'side-left'), 'side-left', postureResults['side-left']);
  const back = useEnrichedPostureAnalysis(imageUrl(images, 'back'), 'back', postureResults.back);
  const sideRight = useEnrichedPostureAnalysis(
    imageUrl(images, 'side-right'),
    'side-right',
    postureResults['side-right'],
  );
  return useMemo(
    () => ({ front, 'side-left': sideLeft, back, 'side-right': sideRight }),
    [front, sideLeft, back, sideRight],
  );
}

export function PostureFilmstrip(props: PostureFilmstripProps) {
  if (props.posture.manualSummary) return (
    <section id="posture-scan" className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">{CLIENT_REPORT_COPY.v2PostureHeading}</h2>
      <p className="text-xs text-muted-foreground">Coach observations</p>
      <ul className="space-y-3">{props.posture.manualSummary.map(line => <li key={line} className="text-sm leading-relaxed text-foreground-secondary">{line}</li>)}</ul>
    </section>
  );
  return <PhotoPostureFilmstrip {...props} />;
}

function PhotoPostureFilmstrip({ posture, embedded = false }: PostureFilmstripProps) {
  const [expandedView, setExpandedView] = useState<PostureFindingViewId | null>(null);
  const results = useEnrichedPostureResults(posture);
  const hasAnalysis = Object.keys(posture.postureResults).length > 0;
  const overview = useMemo(
    () => sanitizeClientReportCopy(buildPostureOverview(reportablePostureFindings(results), hasAnalysis)),
    [results, hasAnalysis],
  );

  return (
    <section id="posture-scan" className={cn('scroll-mt-6', embedded ? '' : 'rounded-sm border border-border bg-card px-6 py-7 sm:px-10')}>
      <h2 className="text-base font-semibold tracking-[-0.02em] text-foreground">
        {CLIENT_REPORT_COPY.v2PostureHeading}
      </h2>

      <div className="mt-5 grid gap-x-8 gap-y-5 lg:grid-cols-2">
        {VIEWS.map((view) => (
          <PostureViewPair
            key={view}
            view={view}
            url={imageUrl(posture.images, view)}
            analysis={results[view]}
            findings={viewFindings(results[view])}
            onOpen={() => setExpandedView(view)}
          />
        ))}
      </div>

      {overview ? (
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-foreground-secondary">{overview}</p>
      ) : null}

      <PostureViewExpandedSheet
        key={expandedView ?? 'closed'}
        view={expandedView}
        findings={expandedView ? viewFindings(results[expandedView]) : []}
        imageUrl={expandedView ? imageUrl(posture.images, expandedView) : ''}
        analysis={expandedView ? results[expandedView] : undefined}
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
  const shown = findings.slice(0, MAX_CARD_FINDINGS);

  return (
    <article className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-4">
      {url ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Open ${CLIENT_REPORT_COPY.v2PostureViewTitle[view].toLowerCase()} posture view`}
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
          {CLIENT_REPORT_COPY.v2PostureViewTitle[view]}
        </p>
        {shown.length === 0 ? (
          <p className="mt-1.5 text-[13px] leading-snug text-foreground-secondary">
            {url ? analysis ? CLIENT_REPORT_COPY.v2PostureViewBalanced : CLIENT_REPORT_COPY.v2PostureUnanalysed : CLIENT_REPORT_COPY.v2PostureViewMissing}
          </p>
        ) : (
          <ul className="mt-1.5 space-y-2">
            {shown.map((f) => {
              const cue = sanitizeClientReportCopy(findingImpact(f).trim());
              return (
                <li key={f.id}>
                  <p className="text-[13px] font-semibold text-foreground">{f.name}</p>
                  {cue ? (
                    <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-foreground-secondary">{cue}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {url && findings.length > 0 ? (
          <button
            type="button"
            onClick={onOpen}
            className="mt-2 text-[12px] font-medium text-foreground underline underline-offset-2"
          >
            {CLIENT_REPORT_COPY.v2PostureOpenDetail}
          </button>
        ) : null}
      </div>
    </article>
  );
}
