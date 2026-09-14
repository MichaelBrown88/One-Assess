import React from 'react';
import type { ClientMovementFindingsModel } from '@/lib/reports/clientMovementFindings';
import { movementProgressionRows } from '@/lib/reports/clientMovementFindings';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { ClientProgressionTable } from './ClientProgressionTable';
import { cn } from '@/lib/utils';

interface ClientMovementFindingsProps {
  findings: ClientMovementFindingsModel;
  className?: string;
}

export function ClientMovementFindings({ findings, className }: ClientMovementFindingsProps) {
  const rows = movementProgressionRows(findings);

  return (
    <div className={cn('mt-5', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {CLIENT_REPORT_COPY.v2ProgressionHeading}
      </p>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-foreground-secondary">{CLIENT_REPORT_COPY.v2MovementPatternsOk}</p>
      ) : (
        <ClientProgressionTable rows={rows} valueLayout="text" />
      )}
    </div>
  );
}
