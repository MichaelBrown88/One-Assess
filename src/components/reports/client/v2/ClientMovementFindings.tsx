import React from 'react';
import type { ClientMovementFindingsModel, MovementFindingTone } from '@/lib/reports/clientMovementFindings';
import { movementWorkOns } from '@/lib/reports/clientMovementFindings';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { sanitizeClientReportCopy } from '@/lib/reports/sanitizeClientReportCopy';
import { cn } from '@/lib/utils';

interface ClientMovementFindingsProps {
  findings: ClientMovementFindingsModel;
  className?: string;
}

const TONE_DOT: Record<MovementFindingTone, string> = {
  good: 'bg-score-green',
  concern: 'bg-score-amber',
  critical: 'bg-score-red',
};

export function ClientMovementFindings({ findings, className }: ClientMovementFindingsProps) {
  const workOns = movementWorkOns(findings);

  return (
    <div className={cn('mt-5', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {CLIENT_REPORT_COPY.v2MovementFindingsHeading}
      </p>
      {workOns.length === 0 ? (
        <p className="mt-2 text-sm text-foreground-secondary">{CLIENT_REPORT_COPY.v2MovementPatternsOk}</p>
      ) : (
        <ul className="mt-2.5 divide-y divide-border">
          {workOns.map((row) => (
            <li key={row.pattern} className="flex gap-3 py-2.5 first:pt-1">
              <span
                className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', TONE_DOT[row.tone])}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {sanitizeClientReportCopy(row.pattern)}
                </p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-foreground-secondary">
                  {sanitizeClientReportCopy(row.detail)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
