import React from 'react';
import type { ClientReportPillarModel } from '@/lib/reports/buildClientReportModel';
import { PillarScoreBadge } from '@/components/reports/PillarScoreBadge';
import type { PillarKey } from '@/lib/reports/radarData';
import { CLIENT_PILLAR_LABELS, CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { sanitizeClientReportCopy } from '@/lib/reports/sanitizeClientReportCopy';
import { ClientProgressionTable } from './ClientProgressionTable';
import { LifestyleFactorsCard } from '@/components/reports/client/sub-components/LifestyleFactorsCard';
import { ClientMovementFindings } from './ClientMovementFindings';
import type { FormData } from '@/contexts/FormContext';
import { cn } from '@/lib/utils';

const SCORING_TO_PILLAR: Record<ClientReportPillarModel['scoringId'], PillarKey> = {
  bodyComp: 'bodyComp',
  strength: 'strength',
  cardio: 'cardio',
  movementQuality: 'movementQuality',
  lifestyle: 'lifestyle',
};

interface ClientPillarBriefProps {
  pillar: ClientReportPillarModel;
  formData?: FormData;
}

export function ClientPillarBrief({ pillar, formData }: ClientPillarBriefProps) {
  const pillarKey = SCORING_TO_PILLAR[pillar.scoringId];
  const title = CLIENT_PILLAR_LABELS[pillar.scoringId] ?? pillar.title;
  const scoreDelta =
    pillar.previousScore != null ? pillar.score - pillar.previousScore : null;

  return (
    <article
      id={`pillar-${pillar.sectionId}`}
      data-section-id={pillar.sectionId}
      className="scroll-mt-24 py-6 sm:py-7"
    >
      <div className="flex items-start gap-4">
        <PillarScoreBadge pillar={pillarKey} score={pillar.score} size={48} showIcon={false} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="text-base font-semibold tracking-[-0.02em] text-foreground">{title}</h3>
            {scoreDelta !== null && scoreDelta !== 0 ? (
              <span
                className={cn(
                  'text-[11px] font-semibold tabular-nums',
                  scoreDelta > 0 ? 'text-score-green-fg' : 'text-score-red-fg',
                )}
              >
                {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta} vs last
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">
            {sanitizeClientReportCopy(pillar.summary)}
          </p>
        </div>
      </div>

      {pillar.contentMode === 'lifestyle-factors' ? (
        <div className="mt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {CLIENT_REPORT_COPY.v2LifestyleFactorsHeading}
          </p>
          <div className="mt-3">
            <LifestyleFactorsCard formData={formData} />
          </div>
        </div>
      ) : null}
      {pillar.contentMode === 'movement-findings' && pillar.movementFindings ? (
        <ClientMovementFindings findings={pillar.movementFindings} />
      ) : null}
      {pillar.contentMode === 'progression' ? (
        <div className="mt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {CLIENT_REPORT_COPY.v2ProgressionHeading}
          </p>
          <ClientProgressionTable rows={pillar.progressionRows} />
        </div>
      ) : null}
    </article>
  );
}
