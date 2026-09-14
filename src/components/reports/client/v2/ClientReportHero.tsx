import React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { sanitizeClientReportCopy } from '@/lib/reports/sanitizeClientReportCopy';
import type { RadarData } from '@/lib/reports/radarData';
import OverallRadarPolygon from '@/components/reports/OverallRadarPolygon';
import { ScoreRing } from '@/components/reports/ScoreRing';
import { ClientReportHeroActions } from './ClientReportHeroActions';
import { cn } from '@/lib/utils';

export interface ClientReportHeroProps {
  clientName: string;
  reportDate: string;
  overall: number;
  previousOverall: number | null;
  welcome: string;
  radarData: RadarData[];
  previousRadarData?: RadarData[];
  orgName?: string;
  showActions?: boolean;
  onDownloadPdf?: () => void;
  onShare?: () => void;
  onSendToClient?: () => void;
}

/** Equal halves: plot is centered in each column so edge→divider spacing matches. */
const HERO_HALF_COL = 'flex h-full w-full min-w-0 justify-center';
const HERO_HALF_PLOT = 'flex w-full max-w-[20rem] flex-col items-center';
const HERO_CHART_CAPTION =
  'mb-4 mt-3 min-h-4 text-center text-[10px] font-black uppercase tracking-[0.15em] leading-none text-muted-foreground';
const HERO_SCORE_SIZE = 128;

export function ClientReportHero({
  clientName,
  reportDate,
  overall,
  previousOverall,
  welcome,
  radarData,
  previousRadarData,
  orgName,
  showActions = false,
  onDownloadPdf,
  onShare,
  onSendToClient,
}: ClientReportHeroProps) {
  const firstName = clientName?.trim().split(/\s+/)[0] || 'client';
  const scoreDiff =
    previousOverall != null && previousOverall > 0 ? overall - previousOverall : null;
  const summary = sanitizeClientReportCopy(welcome || CLIENT_REPORT_COPY.v2HeroWelcomeFallback);

  return (
    <section className="px-6 py-7 sm:px-10 sm:py-8">
      <header className="flex items-start justify-between gap-4">
        <h1 className="min-w-0 text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-[1.85rem]">
          {clientName || 'Your assessment'}
        </h1>
        <div className="shrink-0 pt-0.5 text-right">
          {reportDate ? (
            <p className="text-[12px] font-medium tabular-nums text-muted-foreground">{reportDate}</p>
          ) : null}
          {orgName ? (
            <p className="mt-0.5 text-[12px] font-medium text-foreground/80">{orgName}</p>
          ) : null}
        </div>
      </header>

      <p className="mt-6 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {CLIENT_REPORT_COPY.v2DocumentTitle}
      </p>

      <div
        className={cn(
          'mt-8 grid grid-cols-1 gap-8',
          radarData.length > 0 &&
            'md:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] md:items-stretch md:gap-x-10 md:gap-y-0',
        )}
      >
        <div className={HERO_HALF_COL}>
          <div className={cn(HERO_HALF_PLOT, 'h-full')}>
            <p className={HERO_CHART_CAPTION}>{CLIENT_REPORT_COPY.v2AxisScoreLabel}</p>
            <div className="mt-auto flex w-full flex-col items-center md:pb-10">
              <ScoreRing score={overall} size={HERO_SCORE_SIZE} />
              {scoreDiff !== null && scoreDiff !== 0 ? (
                <span
                  className={cn(
                    'mt-1 inline-flex items-center gap-0.5 text-[13px] font-semibold tabular-nums',
                    scoreDiff > 0 ? 'text-score-green-fg' : 'text-score-red-fg',
                  )}
                >
                  {scoreDiff > 0 ? (
                    <TrendingUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  )}
                  {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff} vs last
                </span>
              ) : null}
              <p className="mt-3 w-full text-center text-[14px] leading-[1.5] text-foreground-secondary">
                {summary}
              </p>
            </div>
            {showActions ? (
              <ClientReportHeroActions
                firstName={firstName}
                onDownloadPdf={onDownloadPdf}
                onShare={onShare}
                onSendToClient={onSendToClient}
              />
            ) : null}
          </div>
        </div>

        {radarData.length > 0 ? (
          <div className="hidden w-px self-stretch bg-border md:block" aria-hidden />
        ) : null}

        {radarData.length > 0 ? (
          <div className={HERO_HALF_COL}>
            <div className={cn(HERO_HALF_PLOT, 'h-full')}>
              <p className={HERO_CHART_CAPTION}>{CLIENT_REPORT_COPY.v2RadarLabel}</p>
              <div className="w-full">
                <OverallRadarPolygon
                  data={radarData}
                  previousData={previousRadarData}
                  hero
                  clientFacingLabels
                  overallScore={overall}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
