import React from 'react';
import type { ClientReportProgressionRow } from '@/lib/reports/clientProgressionRows';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { cn } from '@/lib/utils';

const PROGRESSION_GRID_NUMERIC =
  'grid grid-cols-[minmax(0,1.4fr)_4.5rem_5.25rem] items-center gap-x-3 sm:grid-cols-[minmax(0,1.5fr)_5.5rem_6rem] sm:gap-x-4';

const PROGRESSION_GRID_TEXT =
  'grid grid-cols-[minmax(0,1fr)_4.75rem_5.25rem] items-start gap-x-2 sm:grid-cols-[minmax(0,1.5fr)_6.5rem_7rem] sm:items-center sm:gap-x-4';

interface ClientProgressionTableProps {
  rows: ClientReportProgressionRow[];
  className?: string;
  valueLayout?: 'numeric' | 'text';
}

export function ClientProgressionTable({
  rows,
  className,
  valueLayout = 'numeric',
}: ClientProgressionTableProps) {
  if (rows.length === 0) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">{CLIENT_REPORT_COPY.targetsUnavailable}</p>
    );
  }

  const grid = valueLayout === 'text' ? PROGRESSION_GRID_TEXT : PROGRESSION_GRID_NUMERIC;

  return (
    <div className={cn('mt-4 overflow-hidden border border-border-medium bg-card', className)}>
      <div
        className={cn(
          grid,
          'border-b border-border-medium bg-muted px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground sm:px-4',
        )}
      >
        <span>{CLIENT_REPORT_COPY.progressionMetricCol}</span>
        <span className="text-right">{CLIENT_REPORT_COPY.progressionNowCol}</span>
        <span className="text-right">{CLIENT_REPORT_COPY.progressionTwelveWeekCol}</span>
      </div>
      {rows.map((row, index) => (
        <div
          key={row.name}
          className={cn(
            grid,
            'border-t border-border-medium px-3 py-3 sm:px-4',
            index % 2 === 1 && 'bg-muted',
          )}
        >
          <span
            className={cn(
              'pr-2 text-sm font-medium text-foreground',
              valueLayout === 'text' ? 'leading-snug' : 'truncate',
            )}
          >
            {row.name}
          </span>
          <ProgressionCell value={row.current} unit={row.unit} valueLayout={valueLayout} />
          <ProgressionCell
            value={row.twelveWeeks}
            unit={row.unit}
            valueLayout={valueLayout}
            emphasis
          />
        </div>
      ))}
    </div>
  );
}

function ProgressionCell({
  value,
  unit,
  emphasis = false,
  valueLayout,
}: {
  value: string;
  unit?: string;
  emphasis?: boolean;
  valueLayout: 'numeric' | 'text';
}) {
  const unitLabel = unit?.trim() ?? '';
  const showUnitSlot = valueLayout === 'numeric';
  return (
    <div
      className={cn(
        'flex min-h-[2rem] flex-col items-end justify-center text-right',
        valueLayout === 'numeric' && 'tabular-nums',
      )}
    >
      <span
        className={cn(
          'text-[14px] font-semibold leading-tight tracking-[-0.02em]',
          emphasis ? 'text-foreground' : 'text-foreground-secondary',
        )}
      >
        {value}
      </span>
      {showUnitSlot ? (
        unitLabel ? (
          <span className="mt-0.5 text-[10px] font-medium leading-none text-muted-foreground">
            {unitLabel}
          </span>
        ) : (
          <span className="mt-0.5 block h-[14px]" aria-hidden />
        )
      ) : null}
    </div>
  );
}
