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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {CLIENT_REPORT_COPY.v2DocumentTitle}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {CLIENT_REPORT_COPY.v2DocumentSubtitle}
          </p>
        </div>
        {orgName ? (
          <p className="text-right text-[11px] font-medium text-foreground/80">{orgName}</p>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-[1.85rem]">
          {clientName || 'Your assessment'}
        </h1>
        {reportDate ? (
          <p className="text-[12px] font-medium tabular-nums text-muted-foreground">{reportDate}</p>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col items-center justify-center gap-5 sm:flex-row sm:gap-8">
        <div className="flex flex-col items-center">
          <ScoreRing score={overall} size={140} label={CLIENT_REPORT_COPY.v2AxisScoreLabel} />
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
        </div>
        {radarData.length > 0 ? (
          <div className="w-full max-w-[240px] shrink-0">
            <OverallRadarPolygon
              data={radarData}
              previousData={previousRadarData}
              hero
              clientFacingLabels
              overallScore={overall}
            />
          </div>
        ) : null}
      </div>

      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-foreground-secondary">
        {summary}
      </p>

      {showActions ? (
        <ClientReportHeroActions
          firstName={firstName}
          onDownloadPdf={onDownloadPdf}
          onShare={onShare}
          onSendToClient={onSendToClient}
        />
      ) : null}
    </section>
  );
}
