import React from 'react';
import type { ClientRoadmapCard } from '@/lib/reports/clientRoadmapCards';
import type { ClientNinetyDayTarget } from '@/lib/reports/clientNinetyDayTarget';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { sanitizeClientReportCopy } from '@/lib/reports/sanitizeClientReportCopy';
import { RoadmapTargetFigures } from './ClientRoadmapSupport';
import { cn } from '@/lib/utils';

interface ClientRoadmapSectionProps {
  cards: ClientRoadmapCard[];
  target?: ClientNinetyDayTarget | null;
  embedded?: boolean;
}

export function ClientRoadmapSection({
  cards,
  target,
  embedded = false,
}: ClientRoadmapSectionProps) {
  if (cards.length === 0) return null;

  return (
    <section className={cn(embedded ? '' : 'scroll-mt-24 rounded-sm border border-border bg-card px-6 py-8 sm:px-10')}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-[-0.02em] text-foreground">
            {CLIENT_REPORT_COPY.v2RoadmapHeading}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{CLIENT_REPORT_COPY.v2RoadmapSubheading}</p>
        </div>
        {target ? <RoadmapTargetFigures target={target} /> : null}
      </div>

      <ul className="mt-6 grid gap-x-10 gap-y-5 sm:grid-cols-2">
        {cards.map((card) => (
          <li key={card.pillar}>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {card.pillarLabel}
            </p>
            <p className="mt-0.5 text-[15px] font-semibold tracking-[-0.01em] text-foreground">
              {card.title}
            </p>
            <div className="mt-1 space-y-0.5">
              {card.prescriptions.map((line) => (
                <p key={line} className="text-[13px] leading-snug text-foreground-secondary">
                  {sanitizeClientReportCopy(line)}
                </p>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-[12px] leading-relaxed text-muted-foreground">
        {CLIENT_REPORT_COPY.v2RoadmapCta}
      </p>
    </section>
  );
}
